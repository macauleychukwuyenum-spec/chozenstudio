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

    // Block repurchase during active cycle
    const { data: active } = await supabase
      .from("tier_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("tier_id", tier.id)
      .eq("cycle_status", "active")
      .maybeSingle();
    if (active) throw new Error("You already have an active cycle for this tier.");

    const { data: profile } = await supabase.from("profiles").select("email,full_name").eq("id", userId).maybeSingle();
    if (!profile?.email) throw new Error("Missing email on profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackInitialize } = await import("./paystack.server");

    const reference = `chozen_${tier.slug}_${userId.slice(0, 8)}_${Date.now()}`;

    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      tier_id: tier.id,
      amount_ngn: tier.price_ngn,
      paystack_reference: reference,
      status: "pending",
      metadata: { tier_slug: tier.slug },
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
        custom_fields: [
          { display_name: "Tier", variable_name: "tier", value: tier.name },
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
