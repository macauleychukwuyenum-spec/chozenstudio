import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SITE_ORIGIN } from "@/lib/referral";
import { calculateDiscountedPrice, tierDiscountApplies } from "@/lib/product-pricing";

export const initializeTierCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ tierId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tier, error: tierErr } = await supabase
      .from("tiers")
      .select("*")
      .eq("id", data.tierId)
      .eq("active", true)
      .maybeSingle();
    if (tierErr || !tier) throw new Error("Tier not found");

    // A user can have one active tier cycle. Same-tier repurchase is blocked;
    // other active tiers are treated as an upgrade/downgrade at finalization.
    const { data: active } = await supabase
      .from("tier_purchases")
      .select("id, tier_id, tiers(name, slug, sort_order)")
      .eq("user_id", userId)
      .eq("cycle_status", "active")
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (active?.tier_id === tier.id) throw new Error("You already have an active cycle for this tier.");

    const { data: profile } = await supabase.from("profiles").select("email,full_name").eq("id", userId).maybeSingle();
    if (!profile?.email) throw new Error("Missing email on profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackInitialize } = await import("./paystack.server");

    const activeSort = Number((active as any)?.tiers?.sort_order ?? 0);
    const transition = active
      ? Number(tier.sort_order) > activeSort
        ? "upgrade"
        : "downgrade"
      : "new";

    const reference = `chozen_${transition}_${tier.slug}_${userId.slice(0, 8)}_${Date.now()}`;

    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      tier_id: tier.id,
      amount_ngn: tier.price_ngn,
      paystack_reference: reference,
      status: "pending",
      metadata: {
        tier_slug: tier.slug,
        transition,
        previous_purchase_id: active?.id ?? null,
        previous_tier_id: active?.tier_id ?? null,
      },
    });
    if (insertErr) throw new Error(insertErr.message);

    const init = await paystackInitialize({
      email: profile.email,
      amountNgn: Number(tier.price_ngn),
      reference,
      callbackUrl: `${SITE_ORIGIN}/payment/callback`,
      metadata: {
        user_id: userId,
        tier_id: tier.id,
        tier_slug: tier.slug,
        purpose: "tier",
        transition,
        previous_purchase_id: active?.id ?? null,
        previous_tier_id: active?.tier_id ?? null,
        custom_fields: [
          { display_name: "Tier", variable_name: "tier", value: tier.name },
          { display_name: "Action", variable_name: "action", value: transition },
        ],
      },
    });

    return { authorization_url: init.authorization_url, reference: init.reference };
  });

export const initializeProductCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: productErr } = await supabase
      .from("digital_products")
      .select("*")
      .eq("id", data.productId)
      .eq("published", true)
      .maybeSingle();
    if (productErr || !product) throw new Error("Product not found");

    const { data: owned } = await supabase
      .from("product_purchases" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .maybeSingle();
    if (owned) throw new Error("You already own this product.");

    const [{ data: activeCycle }, { data: discountTiers }] = await Promise.all([
      supabase
        .from("tier_purchases")
        .select("tier_id, tiers(name, service_discount_percentage)")
        .eq("user_id", userId)
        .eq("cycle_status", "active")
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("digital_product_tiers" as any)
        .select("tier_id")
        .eq("product_id", product.id),
    ]);

    const selectedTierIds = (((discountTiers as any[]) ?? []).map((row) => row.tier_id));
    const discountEligible = tierDiscountApplies({
      selectedTierIds,
      activeTierId: (activeCycle as any)?.tier_id,
    });
    const discountPercentage = discountEligible
      ? Number((activeCycle as any)?.tiers?.service_discount_percentage ?? 0)
      : 0;
    const checkoutAmount = calculateDiscountedPrice(Number(product.price_ngn), discountPercentage);
    if (Number(product.price_ngn) <= 0 || checkoutAmount <= 0) throw new Error("This product does not require payment.");

    const { data: profile } = await supabase.from("profiles").select("email,full_name").eq("id", userId).maybeSingle();
    if (!profile?.email) throw new Error("Missing email on profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackInitialize } = await import("./paystack.server");

    const reference = `chozen_product_${product.slug}_${userId.slice(0, 8)}_${Date.now()}`;

    const { error: insertErr } = await supabaseAdmin.from("payments" as any).insert({
      user_id: userId,
      product_id: product.id,
      amount_ngn: checkoutAmount,
      paystack_reference: reference,
      status: "pending",
      metadata: {
        product_slug: product.slug,
        purpose: "product",
        base_price_ngn: Number(product.price_ngn),
        discount_percentage: discountPercentage,
        discount_tier_id: discountEligible ? (activeCycle as any)?.tier_id : null,
        discount_tier_name: discountEligible ? (activeCycle as any)?.tiers?.name : null,
      },
    });
    if (insertErr) throw new Error(insertErr.message);

    const init = await paystackInitialize({
      email: profile.email,
      amountNgn: checkoutAmount,
      reference,
      callbackUrl: `${SITE_ORIGIN}/payment/callback`,
      metadata: {
        user_id: userId,
        product_id: product.id,
        product_slug: product.slug,
        purpose: "product",
        base_price_ngn: Number(product.price_ngn),
        discount_percentage: discountPercentage,
        discount_tier_id: discountEligible ? (activeCycle as any)?.tier_id : null,
        discount_tier_name: discountEligible ? (activeCycle as any)?.tiers?.name : null,
        custom_fields: [
          { display_name: "Product", variable_name: "product", value: product.title },
          { display_name: "Discount", variable_name: "discount", value: `${discountPercentage}%` },
        ],
      },
    });

    return { authorization_url: init.authorization_url, reference: init.reference, amount_ngn: checkoutAmount, discount_percentage: discountPercentage };
  });

export const initializeCourseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ courseId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", data.courseId)
      .eq("published", true)
      .maybeSingle();
    if (courseErr || !course) throw new Error("Course not found");

    const [{ data: roles }, { data: owned }, { data: activeCycles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("course_purchases" as any).select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
      supabase
        .from("tier_purchases")
        .select("tier_id, tiers(course_access_level)")
        .eq("user_id", userId)
        .eq("cycle_status", "active"),
    ]);
    const isAdmin = Boolean(roles?.some((role: any) => role.role === "admin"));
    const maxCourseLevel = Math.max(0, ...(((activeCycles as any[]) ?? []).map((cycle) => Number(cycle.tiers?.course_access_level ?? 0))));
    if (isAdmin || owned || maxCourseLevel >= Number(course.required_access_level)) {
      throw new Error("You already have access to this course.");
    }
    if (Number(course.price_ngn) <= 0) throw new Error("This course does not require payment.");

    const { data: profile } = await supabase.from("profiles").select("email,full_name").eq("id", userId).maybeSingle();
    if (!profile?.email) throw new Error("Missing email on profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackInitialize } = await import("./paystack.server");
    const reference = `chozen_course_${course.slug}_${userId.slice(0, 8)}_${Date.now()}`;

    const { error: insertErr } = await supabaseAdmin.from("payments" as any).insert({
      user_id: userId,
      course_id: course.id,
      amount_ngn: course.price_ngn,
      paystack_reference: reference,
      status: "pending",
      metadata: {
        course_slug: course.slug,
        purpose: "course",
      },
    });
    if (insertErr) throw new Error(insertErr.message);

    const init = await paystackInitialize({
      email: profile.email,
      amountNgn: Number(course.price_ngn),
      reference,
      callbackUrl: `${SITE_ORIGIN}/payment/callback`,
      metadata: {
        user_id: userId,
        course_id: course.id,
        course_slug: course.slug,
        purpose: "course",
        custom_fields: [
          { display_name: "Course", variable_name: "course", value: course.title },
        ],
      },
    });

    return { authorization_url: init.authorization_url, reference: init.reference };
  });

export const purchaseProductWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: productErr } = await supabase
      .from("digital_products")
      .select("*")
      .eq("id", data.productId)
      .eq("published", true)
      .maybeSingle();
    if (productErr || !product) throw new Error("Product not found");

    const { data: owned } = await supabase
      .from("product_purchases" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .maybeSingle();
    if (owned) throw new Error("You already own this product.");

    const [{ data: activeCycle }, { data: discountTiers }, { data: wallet }] = await Promise.all([
      supabase
        .from("tier_purchases")
        .select("tier_id, tiers(name, service_discount_percentage)")
        .eq("user_id", userId)
        .eq("cycle_status", "active")
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("digital_product_tiers" as any)
        .select("tier_id")
        .eq("product_id", product.id),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const selectedTierIds = (((discountTiers as any[]) ?? []).map((row) => row.tier_id));
    const discountEligible = tierDiscountApplies({
      selectedTierIds,
      activeTierId: (activeCycle as any)?.tier_id,
    });
    const discountPercentage = discountEligible
      ? Number((activeCycle as any)?.tiers?.service_discount_percentage ?? 0)
      : 0;
    const amountNgn = calculateDiscountedPrice(Number(product.price_ngn), discountPercentage);
    if (amountNgn <= 0) throw new Error("This product does not require payment.");
    if (Number(wallet?.balance_ngn ?? 0) < amountNgn) throw new Error("Insufficient wallet balance.");

    const reference = `wallet_product_${product.slug}_${userId.slice(0, 8)}_${Date.now()}`;
    const { data: newBalance, error: walletErr } = await supabaseAdmin.rpc("debit_wallet_for_purchase" as any, {
      p_user_id: userId,
      p_amount_ngn: amountNgn,
    } as any);
    if (walletErr) throw new Error(walletErr.message);

    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("product_purchases" as any)
      .insert({
        user_id: userId,
        product_id: product.id,
        amount_paid_ngn: amountNgn,
        payment_reference: reference,
      })
      .select()
      .single();
    if (purchaseErr) {
      await supabaseAdmin
        .from("wallets")
        .update({ balance_ngn: Number(newBalance ?? 0) + amountNgn, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      throw new Error(purchaseErr.message);
    }

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      type: "purchase" as any,
      amount_ngn: -amountNgn,
      description: `Digital product purchase: ${product.title}`,
      reference,
    });
    await supabaseAdmin.from("payments" as any).insert({
      user_id: userId,
      product_id: product.id,
      product_purchase_id: purchase.id,
      amount_ngn: amountNgn,
      paystack_reference: reference,
      status: "success",
      verified_at: new Date().toISOString(),
      metadata: {
        purpose: "product",
        source: "wallet",
        product_slug: product.slug,
        base_price_ngn: Number(product.price_ngn),
        discount_percentage: discountPercentage,
      },
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: `${product.title} unlocked`,
      body: "Your wallet payment was successful. The product is ready to view and download.",
    });

    return { ok: true, redirectTo: `/products/${product.slug}`, message: `${product.title} unlocked` };
  });

export const ensureProductAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: productErr } = await supabaseAdmin
      .from("digital_products")
      .select("*")
      .eq("id", data.productId)
      .eq("published", true)
      .maybeSingle();
    if (productErr || !product) throw new Error("Product not found");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = Boolean(roles?.some((role: any) => role.role === "admin"));

    let { data: purchase } = await supabaseAdmin
      .from("product_purchases" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .maybeSingle();

    if (!purchase) {
      const { data: payments } = await supabaseAdmin
        .from("payments" as any)
        .select("*")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const payment of (payments as any[]) ?? []) {
        if (payment.status === "pending" && payment.paystack_reference?.startsWith("chozen_product_")) {
          const { finalizePayment } = await import("./paystack.server");
          await finalizePayment(payment.paystack_reference);
        }

        const { data: refreshedPurchase } = await supabaseAdmin
          .from("product_purchases" as any)
          .select("*")
          .eq("user_id", userId)
          .eq("product_id", product.id)
          .maybeSingle();
        if (refreshedPurchase) {
          purchase = refreshedPurchase;
          break;
        }

        if (payment.status === "success") {
          const { data: repairedPurchase, error: repairErr } = await supabaseAdmin
            .from("product_purchases" as any)
            .insert({
              user_id: userId,
              product_id: product.id,
              amount_paid_ngn: Number(payment.amount_ngn ?? product.price_ngn ?? 0),
              payment_reference: payment.paystack_reference,
            })
            .select()
            .single();
          if (!repairErr) {
            purchase = repairedPurchase;
            await supabaseAdmin
              .from("payments" as any)
              .update({ product_purchase_id: repairedPurchase.id })
              .eq("id", payment.id);
            break;
          }
        }
      }
    }

    const hasAccess = isAdmin || Boolean(purchase);
    let fileUrl: string | null = null;
    if (hasAccess && product.file_url) {
      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from("product-files")
        .createSignedUrl(product.file_url, 60 * 60 * 24);
      if (signedErr) throw new Error(signedErr.message);
      fileUrl = signed.signedUrl;
    }

    return {
      hasAccess,
      isAdmin,
      owned: Boolean(purchase),
      fileUrl,
      message: hasAccess ? "Product access confirmed" : "No completed purchase found for this product.",
    };
  });

export const purchaseCourseWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ courseId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", data.courseId)
      .eq("published", true)
      .maybeSingle();
    if (courseErr || !course) throw new Error("Course not found");

    const [{ data: roles }, { data: owned }, { data: activeCycles }, { data: wallet }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("course_purchases" as any).select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
      supabase
        .from("tier_purchases")
        .select("tier_id, tiers(course_access_level)")
        .eq("user_id", userId)
        .eq("cycle_status", "active"),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const isAdmin = Boolean(roles?.some((role: any) => role.role === "admin"));
    const maxCourseLevel = Math.max(0, ...(((activeCycles as any[]) ?? []).map((cycle) => Number(cycle.tiers?.course_access_level ?? 0))));
    if (isAdmin || owned || maxCourseLevel >= Number(course.required_access_level)) {
      throw new Error("You already have access to this course.");
    }

    const amountNgn = Number(course.price_ngn ?? 0);
    if (amountNgn <= 0) throw new Error("This course does not require payment.");
    if (Number(wallet?.balance_ngn ?? 0) < amountNgn) throw new Error("Insufficient wallet balance.");

    const reference = `wallet_course_${course.slug}_${userId.slice(0, 8)}_${Date.now()}`;
    const { data: newBalance, error: walletErr } = await supabaseAdmin.rpc("debit_wallet_for_purchase" as any, {
      p_user_id: userId,
      p_amount_ngn: amountNgn,
    } as any);
    if (walletErr) throw new Error(walletErr.message);

    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("course_purchases" as any)
      .insert({
        user_id: userId,
        course_id: course.id,
        amount_paid_ngn: amountNgn,
        payment_reference: reference,
      })
      .select()
      .single();
    if (purchaseErr) {
      await supabaseAdmin
        .from("wallets")
        .update({ balance_ngn: Number(newBalance ?? 0) + amountNgn, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      throw new Error(purchaseErr.message);
    }

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      type: "purchase" as any,
      amount_ngn: -amountNgn,
      description: `Course purchase: ${course.title}`,
      reference,
    });
    await supabaseAdmin.from("payments" as any).insert({
      user_id: userId,
      course_id: course.id,
      course_purchase_id: purchase.id,
      amount_ngn: amountNgn,
      paystack_reference: reference,
      status: "success",
      verified_at: new Date().toISOString(),
      metadata: {
        purpose: "course",
        source: "wallet",
        course_slug: course.slug,
      },
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: `${course.title} unlocked`,
      body: "Your wallet payment was successful. You can now start the course.",
    });

    return { ok: true, redirectTo: `/courses/${course.slug}`, message: `${course.title} unlocked` };
  });

export const verifyPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ reference: z.string().min(3) }).parse(data))
  .handler(async ({ data }) => {
    const { finalizePayment } = await import("./paystack.server");
    return finalizePayment(data.reference);
  });
