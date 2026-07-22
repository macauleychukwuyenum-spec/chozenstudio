import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const applyReferralCodeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(3).max(32) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, referred_by")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile) throw new Error("Profile not found.");
    if (profile.referred_by) return { applied: false, reason: "already_referred" };

    const { data: referrer, error: referrerErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (referrerErr) throw new Error(referrerErr.message);
    if (!referrer || referrer.id === userId) return { applied: false, reason: "invalid_code" };

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId)
      .is("referred_by", null);
    if (updateErr) throw new Error(updateErr.message);

    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referrer_id", referrer.id)
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await supabaseAdmin.from("referrals").insert({
        referrer_id: referrer.id,
        referred_user_id: userId,
        reward_amount_ngn: 0,
        status: "pending",
      });
      if (insertErr) throw new Error(insertErr.message);
    }

    return { applied: true };
  });
