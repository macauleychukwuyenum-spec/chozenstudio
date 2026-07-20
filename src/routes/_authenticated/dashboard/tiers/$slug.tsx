import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { initializeTierCheckout } from "@/lib/paystack.functions";

export const Route = createFileRoute("/_authenticated/dashboard/tiers/$slug")({
  component: TierDetail,
});

function TierDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [buying, setBuying] = useState(false);
  const startCheckout = useServerFn(initializeTierCheckout);

  const { data: tier, isLoading } = useQuery({
    queryKey: ["tier", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tiers").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["tier-active", slug, user?.id],
    enabled: !!user?.id && !!tier?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tier_purchases")
        .select("*")
        .eq("user_id", user!.id)
        .eq("tier_id", tier!.id)
        .eq("cycle_status", "active")
        .maybeSingle();
      return data;
    },
  });

  async function handleBuy() {
    if (!tier || !user) return;
    setBuying(true);
    try {
      const res = await startCheckout({ data: { tierId: tier.id } });
      window.location.href = res.authorization_url;
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout");
      setBuying(false);
    }
  }

  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!tier) return <div className="p-10">Tier not found.</div>;

  const benefits = Array.isArray(tier.benefits) ? (tier.benefits as string[]) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      <Link to="/dashboard/tiers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> All tiers
      </Link>

      <div className="glass-strong rounded-3xl p-6 md:p-10 grid md:grid-cols-[1.2fr_1fr] gap-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{tier.name}</h1>
          {tier.tagline && <p className="text-muted-foreground mt-1">{tier.tagline}</p>}
          <p className="mt-4 text-foreground/80">{tier.description}</p>

          <ul className="mt-6 space-y-2 text-sm">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" /> <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Referral reward" value={`${tier.reward_percentage}%`} />
            <Stat label="Max referrals" value={String(tier.max_referrals)} />
            <Stat label="Referrals to withdraw" value={String(tier.referral_requirement)} />
            <Stat label="Service discount" value={`${tier.service_discount_percentage}%`} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6 h-fit sticky top-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Lifetime access</div>
          <div className="text-4xl font-display font-bold mt-2">{formatNGN(tier.price_ngn)}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Secure Paystack checkout</li>
            <li className="flex gap-2"><Lock className="w-4 h-4 text-primary" /> One-time payment, forever access</li>
          </ul>
          {existing ? (
            <div className="mt-5 glass rounded-xl p-3 text-sm">
              You already have an active cycle for this tier. Complete your referral cycle to repurchase.
            </div>
          ) : (
            <Button
              onClick={handleBuy}
              disabled={buying}
              className="w-full mt-5 h-11 rounded-xl gradient-primary text-primary-foreground shadow-glow"
            >
              {buying ? "Starting checkout…" : "Pay with Paystack"}
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Prices in NGN. Powered by Paystack.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
