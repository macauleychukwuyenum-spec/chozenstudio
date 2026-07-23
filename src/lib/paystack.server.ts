// Server-only Paystack helpers. Never import at module scope in files that
// end up in the client bundle — import inside handlers via `await import()`.

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned" | string;
    reference: string;
    amount: number; // kobo
    currency: string;
    customer: { email: string };
    metadata?: any;
    paid_at?: string;
  };
};

export function paystackSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured. Add your Paystack secret key to the server environment.");
  return key;
}

export async function paystackInitialize(input: {
  email: string;
  amountNgn: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNgn * 100),
      reference: input.reference,
      currency: "NGN",
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack initialize failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  };
  if (!json.status) throw new Error(json.message || "Paystack initialize failed");
  return json.data;
}

export async function paystackVerify(reference: string): Promise<PaystackVerifyResponse> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecret()}` },
  });
  if (!res.ok) throw new Error(`Paystack verification failed (${res.status})`);
  return (await res.json()) as PaystackVerifyResponse;
}

/**
 * Idempotently finalize a Paystack payment:
 *  - mark payments row as success
 *  - create tier_purchase if tier payment
 *  - credit referrer per tier reward_percentage (once per referred user + tier cycle)
 *  - write wallet ledger entries + notifications
 * Safe to call from callback AND webhook. A successful payment may be retried
 * after the payment row was marked success, so tier/referral side effects must
 * also be idempotent.
 */
export async function finalizePayment(reference: string): Promise<{
  ok: boolean;
  status: string;
  message: string;
  redirectTo?: string;
  redirectLabel?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!payment) return { ok: false, status: "not_found", message: "Payment record missing" };

  let completionMessage = "Payment finalized";
  let redirectTo: string | undefined;
  let redirectLabel: string | undefined;
  let paidNgn = Number(payment.amount_ngn ?? 0);
  if (payment.status !== "success") {
    const verify = await paystackVerify(reference);
    if (!verify.status || verify.data?.status !== "success") {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      return { ok: false, status: "failed", message: verify.message || "Verification failed" };
    }

    paidNgn = Number((verify.data.amount / 100).toFixed(2));

    // Mark success first (guards against re-entrancy)
    const { error: markErr } = await supabaseAdmin
      .from("payments")
      .update({ status: "success", verified_at: new Date().toISOString(), amount_ngn: paidNgn })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (markErr) return { ok: false, status: "error", message: markErr.message };
  }

  // Tier purchase flow
  if (payment.tier_id) {
    const { data: tier } = await supabaseAdmin.from("tiers").select("*").eq("id", payment.tier_id).maybeSingle();
    if (!tier) return { ok: false, status: "error", message: "Tier missing" };
    completionMessage = `${tier.name} tier activated`;
    redirectTo = "/dashboard/tiers";
    redirectLabel = "View tier";

    let purchase = null;
    if (payment.purchase_id) {
      const { data: existingPurchase } = await supabaseAdmin
        .from("tier_purchases")
        .select("*")
        .eq("id", payment.purchase_id)
        .maybeSingle();
      purchase = existingPurchase;
    }

    if (!purchase) {
      const completedAt = new Date().toISOString();
      await supabaseAdmin
        .from("tier_purchases")
        .update({ cycle_status: "completed", completed_at: completedAt })
        .eq("user_id", payment.user_id)
        .eq("cycle_status", "active");

      const { data: newPurchase, error: purchErr } = await supabaseAdmin
        .from("tier_purchases")
        .insert({
          user_id: payment.user_id,
          tier_id: payment.tier_id,
          amount_paid_ngn: paidNgn,
          cycle_status: "active",
        })
        .select()
        .single();
      if (purchErr) return { ok: false, status: "error", message: purchErr.message };
      purchase = newPurchase;

      await supabaseAdmin.from("payments").update({ purchase_id: purchase.id }).eq("id", payment.id);

      // Notify buyer only when the purchase is first created.
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.user_id,
        title: `${tier.name} tier activated`,
        body: `Your ${tier.name} tier is now active. Enjoy your benefits.`,
      });
    }

    const rewardBaseNgn = paidNgn || Number(purchase.amount_paid_ngn ?? 0);

    // --- Referral crediting: only direct referrer, only first rewarded tier purchase by this user ---
    const { data: buyer } = await supabaseAdmin
      .from("profiles")
      .select("referred_by, full_name, email")
      .eq("id", payment.user_id)
      .maybeSingle();

    if (buyer?.referred_by) {
      const { data: existingReferral } = await supabaseAdmin
        .from("referrals")
        .select("id, status")
        .eq("referrer_id", buyer.referred_by)
        .eq("referred_user_id", payment.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingReferral?.status !== "rewarded") {
        // Check referrer has an active cycle and cap
        const { data: referrerActive } = await supabaseAdmin
          .from("tier_purchases")
          .select("*, tiers(*)")
          .eq("user_id", buyer.referred_by)
          .eq("cycle_status", "active")
          .order("purchased_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const reward = Number(((rewardBaseNgn * Number(tier.reward_percentage)) / 100).toFixed(2));

        if (referrerActive && referrerActive.rewarded_referrals_count < Number(referrerActive.tiers?.max_referrals ?? 0)) {
          // Credit wallet
          const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("*")
            .eq("user_id", buyer.referred_by)
            .maybeSingle();
          if (wallet) {
            await supabaseAdmin
              .from("wallets")
              .update({
                balance_ngn: Number(wallet.balance_ngn) + reward,
                lifetime_earnings_ngn: Number(wallet.lifetime_earnings_ngn) + reward,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", buyer.referred_by);
          }

          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: buyer.referred_by,
            type: "referral_reward",
            amount_ngn: reward,
            description: `Referral reward from ${buyer.full_name || buyer.email} (${tier.name})`,
            reference: reference,
          });

          const rewardedPatch = {
            tier_purchase_id: purchase.id,
            cycle_purchase_id: referrerActive.id,
            reward_amount_ngn: reward,
            status: "rewarded",
            rewarded_at: new Date().toISOString(),
          };

          if (existingReferral) {
            await supabaseAdmin.from("referrals").update(rewardedPatch).eq("id", existingReferral.id);
          } else {
            await supabaseAdmin.from("referrals").insert({
              referrer_id: buyer.referred_by,
              referred_user_id: payment.user_id,
              ...rewardedPatch,
            });
          }

          await supabaseAdmin
            .from("tier_purchases")
            .update({ rewarded_referrals_count: referrerActive.rewarded_referrals_count + 1 })
            .eq("id", referrerActive.id);

          await supabaseAdmin.from("notifications").insert({
            user_id: buyer.referred_by,
            title: "Referral reward credited",
            body: `You earned ${reward.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })} from a new tier purchase.`,
          });
        } else {
          // Track as pending even if not eligible (for visibility)
          const pendingPatch = {
            tier_purchase_id: purchase.id,
            reward_amount_ngn: reward,
            status: "pending",
          };

          if (existingReferral) {
            await supabaseAdmin.from("referrals").update(pendingPatch).eq("id", existingReferral.id);
          } else {
            await supabaseAdmin.from("referrals").insert({
              referrer_id: buyer.referred_by,
              referred_user_id: payment.user_id,
              ...pendingPatch,
            });
          }
        }
      }
    }
  }

  const productId = (payment as any).product_id as string | null | undefined;
  if (productId) {
    const { data: product } = await supabaseAdmin
      .from("digital_products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { ok: false, status: "error", message: "Product missing" };
    completionMessage = `${product.title} unlocked`;
    redirectTo = `/products/${product.slug}`;
    redirectLabel = "View product";

    let productPurchase = null;
    const productPurchaseId = (payment as any).product_purchase_id as string | null | undefined;
    if (productPurchaseId) {
      const { data: existingById } = await supabaseAdmin
        .from("product_purchases" as any)
        .select("*")
        .eq("id", productPurchaseId)
        .maybeSingle();
      productPurchase = existingById;
    }

    if (!productPurchase) {
      const { data: existingByReference } = await supabaseAdmin
        .from("product_purchases" as any)
        .select("*")
        .eq("payment_reference", reference)
        .maybeSingle();
      productPurchase = existingByReference;
    }

    if (!productPurchase) {
      const { data: existingByProduct } = await supabaseAdmin
        .from("product_purchases" as any)
        .select("*")
        .eq("user_id", payment.user_id)
        .eq("product_id", productId)
        .maybeSingle();
      productPurchase = existingByProduct;
    }

    let createdProductPurchase = false;
    if (!productPurchase) {
      const { data: newProductPurchase, error: productPurchaseErr } = await supabaseAdmin
        .from("product_purchases" as any)
        .insert({
          user_id: payment.user_id,
          product_id: productId,
          amount_paid_ngn: paidNgn || Number(product.price_ngn ?? 0),
          payment_reference: reference,
        })
        .select()
        .single();
      if (productPurchaseErr) return { ok: false, status: "error", message: productPurchaseErr.message };
      productPurchase = newProductPurchase;
      createdProductPurchase = true;
    } else if (!productPurchase.payment_reference) {
      await supabaseAdmin
        .from("product_purchases" as any)
        .update({ payment_reference: reference })
        .eq("id", productPurchase.id);
    }

    await supabaseAdmin
      .from("payments" as any)
      .update({ product_purchase_id: productPurchase.id })
      .eq("id", payment.id);

    if (createdProductPurchase) {
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.user_id,
        title: `${product.title} unlocked`,
        body: "Your digital product is ready to view and download.",
      });
    }
  }

  const courseId = (payment as any).course_id as string | null | undefined;
  if (courseId) {
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();
    if (!course) return { ok: false, status: "error", message: "Course missing" };
    completionMessage = `${course.title} unlocked`;
    redirectTo = `/courses/${course.slug}`;
    redirectLabel = "View course";

    let coursePurchase = null;
    const coursePurchaseId = (payment as any).course_purchase_id as string | null | undefined;
    if (coursePurchaseId) {
      const { data: existingById } = await supabaseAdmin
        .from("course_purchases" as any)
        .select("*")
        .eq("id", coursePurchaseId)
        .maybeSingle();
      coursePurchase = existingById;
    }

    if (!coursePurchase) {
      const { data: existingByReference } = await supabaseAdmin
        .from("course_purchases" as any)
        .select("*")
        .eq("payment_reference", reference)
        .maybeSingle();
      coursePurchase = existingByReference;
    }

    if (!coursePurchase) {
      const { data: existingByCourse } = await supabaseAdmin
        .from("course_purchases" as any)
        .select("*")
        .eq("user_id", payment.user_id)
        .eq("course_id", courseId)
        .maybeSingle();
      coursePurchase = existingByCourse;
    }

    let createdCoursePurchase = false;
    if (!coursePurchase) {
      const { data: newCoursePurchase, error: coursePurchaseErr } = await supabaseAdmin
        .from("course_purchases" as any)
        .insert({
          user_id: payment.user_id,
          course_id: courseId,
          amount_paid_ngn: paidNgn || Number(course.price_ngn ?? 0),
          payment_reference: reference,
        })
        .select()
        .single();
      if (coursePurchaseErr) return { ok: false, status: "error", message: coursePurchaseErr.message };
      coursePurchase = newCoursePurchase;
      createdCoursePurchase = true;
    } else if (!coursePurchase.payment_reference) {
      await supabaseAdmin
        .from("course_purchases" as any)
        .update({ payment_reference: reference })
        .eq("id", coursePurchase.id);
    }

    await supabaseAdmin
      .from("payments" as any)
      .update({ course_purchase_id: coursePurchase.id })
      .eq("id", payment.id);

    if (createdCoursePurchase) {
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.user_id,
        title: `${course.title} unlocked`,
        body: "Your course is ready. You can now start learning.",
      });
    }
  }

  return { ok: true, status: "success", message: completionMessage, redirectTo, redirectLabel };
}
