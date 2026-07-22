import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, Rocket, Gem, BadgeCheck, PenLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/tiers/")({
  component: TiersListPage,
});

const ICONS: Record<string, typeof Sparkles> = { explorer: Sparkles, creator: Rocket, pro: Gem, elite: Crown };

function TiersListPage() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data: tiers } = useQuery({
    queryKey: ["tiers-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tiers").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ["my-purchases", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_purchases")
        .select("*, tiers(name, slug, sort_order, max_referrals)")
        .eq("user_id", uid!);
      if (error) throw error;
      return data;
    },
  });

  const statusByTier = new Map<string, "active" | "completed">();
  const activeCycleByTier = new Map<string, any>();
  const activeCycle = purchases?.find((p: any) => p.cycle_status === "active");
  const activeSort = Number((activeCycle as any)?.tiers?.sort_order ?? 0);
  purchases?.forEach((p) => {
    const prev = statusByTier.get(p.tier_id);
    if (p.cycle_status === "active") {
      statusByTier.set(p.tier_id, "active");
      activeCycleByTier.set(p.tier_id, p);
    } else if (!prev) statusByTier.set(p.tier_id, "completed");
  });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Chozen Tiers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Each tier purchase starts one referral earning cycle. When the cycle's cap is reached,
          renew the tier to earn again — your benefits and history stay yours forever.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers?.map((t) => {
          const Icon = ICONS[t.slug] ?? Sparkles;
          const status = statusByTier.get(t.id);
          const cycle = activeCycleByTier.get(t.id);
          const isCurrentActive = activeCycle?.tier_id === t.id;
          const actionLabel = isCurrentActive
            ? "View active cycle"
            : activeCycle
              ? Number(t.sort_order) > activeSort
                ? `Upgrade to ${t.name}`
                : `Downgrade to ${t.name}`
              : status === "completed"
                ? `Renew ${t.name}`
                : `Get ${t.name}`;
          const benefits = Array.isArray(t.benefits) ? (t.benefits as string[]) : [];
          const used = cycle ? Number(cycle.rewarded_referrals_count) : 0;
          const cap = Number(t.max_referrals);
          const pct = cycle ? Math.min(100, (used / Math.max(cap, 1)) * 100) : 0;
          return (
            <div key={t.id} className="glass-strong rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground grid place-items-center">
                  <Icon className="w-5 h-5" />
                </div>
                {status === "active" && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                    <BadgeCheck className="w-3 h-3" /> Cycle active
                  </span>
                )}
                {status === "completed" && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/15 text-warning">
                    Renew to earn
                  </span>
                )}
              </div>
              <h3 className="text-xl font-display font-bold mt-4">{t.name}</h3>
              <div className="mt-2 text-2xl font-display font-bold">{formatNGN(t.price_ngn)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {cap} rewarded referrals / cycle · {Number(t.reward_percentage)}% commission
              </div>
              {cycle && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{used} / {cap} in current cycle</div>
                </div>
              )}
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {benefits.slice(0, 5).map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-5 rounded-xl ${isCurrentActive ? "" : "gradient-primary text-primary-foreground shadow-glow"}`}
                variant={isCurrentActive ? "outline" : "default"}
              >
                <Link to="/dashboard/tiers/$slug" params={{ slug: t.slug }}>
                  {actionLabel}
                </Link>
              </Button>
              {isCurrentActive && t.can_submit_blogs && (
                <Button asChild className="mt-2 rounded-xl gradient-primary text-primary-foreground shadow-glow">
                  <Link to="/dashboard/blog">
                    <PenLine className="w-4 h-4 mr-1" /> Add blog for approval
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

