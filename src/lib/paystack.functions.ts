import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SITE_ORIGIN } from "@/lib/referral";

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

export const verifyPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ reference: z.string().min(3) }).parse(data))
  .handler(async ({ data }) => {
    const { finalizePayment } = await import("./paystack.server");
    return finalizePayment(data.reference);
  });
