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
 * Safe to call from callback AND webhook (uses payments.status guard).
 */
export async function finalizePayment(reference: string): Promise<{
  ok: boolean;
  status: string;
  message: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!payment) return { ok: false, status: "not_found", message: "Payment record missing" };
  if (payment.status === "success") return { ok: true, status: "success", message: "Already finalized" };

  const verify = await paystackVerify(reference);
  if (!verify.status || verify.data?.status !== "success") {
    await supabaseAdmin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { ok: false, status: "failed", message: verify.message || "Verification failed" };
  }

  const paidNgn = Number((verify.data.amount / 100).toFixed(2));

  // Mark success first (guards against re-entrancy)
  const { error: markErr } = await supabaseAdmin
    .from("payments")
    .update({ status: "success", verified_at: new Date().toISOString(), amount_ngn: paidNgn })
    .eq("id", payment.id)
    .eq("status", "pending");
  if (markErr) return { ok: false, status: "error", message: markErr.message };

  // Tier purchase flow
  if (payment.tier_id) {
    const { data: tier } = await supabaseAdmin.from("tiers").select("*").eq("id", payment.tier_id).maybeSingle();
    if (!tier) return { ok: false, status: "error", message: "Tier missing" };

    const completedAt = new Date().toISOString();
    await supabaseAdmin
      .from("tier_purchases")
      .update({ cycle_status: "completed", completed_at: completedAt })
      .eq("user_id", payment.user_id)
      .eq("cycle_status", "active");

    const { data: purchase, error: purchErr } = await supabaseAdmin
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

    await supabaseAdmin.from("payments").update({ purchase_id: purchase.id }).eq("id", payment.id);

    // Notify buyer
    await supabaseAdmin.from("notifications").insert({
      user_id: payment.user_id,
      title: `${tier.name} tier activated`,
      body: `Your ${tier.name} tier is now active. Enjoy your benefits.`,
    });

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

        const reward = Number(((paidNgn * Number(tier.reward_percentage)) / 100).toFixed(2));

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

  return { ok: true, status: "success", message: "Payment finalized" };
}
