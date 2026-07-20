import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/site/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, Rocket, Gem } from "lucide-react";

export const Route = createFileRoute("/tiers")({
  head: () => ({
    meta: [
      { title: "Chozen Tiers — Lifetime Access | Chozen Studio" },
      { name: "description", content: "Choose your Chozen Tier: Explorer, Creator, Pro, or Elite. Lifetime access, referral rewards, and premium benefits." },
      { property: "og:title", content: "Chozen Tiers" },
      { property: "og:description", content: "Lifetime access with rewards. Explorer, Creator, Pro, Elite." },
    ],
  }),
  component: TiersPage,
});

const ICONS: Record<string, typeof Sparkles> = {
  explorer: Sparkles, creator: Rocket, pro: Gem, elite: Crown,
};

function TiersPage() {
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tiers")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 md:px-6 pt-14 pb-8 text-center">
        <div className="inline-flex glass rounded-full px-3 py-1.5 text-xs font-medium mb-4">
          Lifetime access
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold">
          Choose your <span className="text-gradient">Chozen Tier</span>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          One payment, forever access. Every tier unlocks new benefits, higher rewards,
          and larger service discounts.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6 pb-24">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-96 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers?.map((t, idx) => {
              const Icon = ICONS[t.slug] ?? Sparkles;
              const highlight = idx === 2;
              const benefits = Array.isArray(t.benefits) ? (t.benefits as string[]) : [];
              return (
                <div
                  key={t.id}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    highlight
                      ? "gradient-navy text-navy-foreground shadow-elevated scale-[1.02]"
                      : "glass-strong"
                  }`}
                >
                  {highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground text-xs px-3 py-1 rounded-full shadow-glow">
                      Most Popular
                    </span>
                  )}
                  <div className={`w-11 h-11 rounded-xl grid place-items-center mb-4 ${
                    highlight ? "bg-white/10" : "gradient-primary text-primary-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-display font-bold">{t.name}</h3>
                  {t.tagline && <p className={`text-sm mt-1 ${highlight ? "text-navy-foreground/70" : "text-muted-foreground"}`}>{t.tagline}</p>}
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-display font-bold">{formatNGN(t.price_ngn)}</span>
                    <span className={`text-xs ${highlight ? "text-navy-foreground/60" : "text-muted-foreground"}`}>/ lifetime</span>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm flex-1">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlight ? "text-primary-glow" : "text-primary"}`} />
                        <span className={highlight ? "text-navy-foreground/90" : "text-foreground/90"}>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-5 pt-4 border-t ${highlight ? "border-white/10" : "border-border"} space-y-1 text-xs ${highlight ? "text-navy-foreground/70" : "text-muted-foreground"}`}>
                    <div>Reward: <b className={highlight ? "text-navy-foreground" : "text-foreground"}>{t.reward_percentage}%</b> · Max {t.max_referrals} referrals</div>
                    <div>Service discount: <b className={highlight ? "text-navy-foreground" : "text-foreground"}>{t.service_discount_percentage}%</b></div>
                  </div>
                  <Button
                    asChild
                    className={`mt-5 w-full rounded-xl ${
                      highlight
                        ? "bg-white text-navy hover:bg-white/90"
                        : "gradient-primary text-primary-foreground shadow-glow"
                    }`}
                  >
                    <Link to="/dashboard/tiers/$slug" params={{ slug: t.slug }}>
                      Get {t.name}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
