import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Copy, Wallet, Users, TrendingUp, Layers, ArrowRight,
  GraduationCap, Package, Wrench, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { referralLink } from "@/lib/referral";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data } = useQuery({
    queryKey: ["dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [wallet, profile, purchases, refs, txns] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", uid!).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", uid!).maybeSingle(),
        supabase.from("tier_purchases").select("*, tiers(*)").eq("user_id", uid!).order("purchased_at", { ascending: false }),
        supabase.from("referrals").select("*").eq("referrer_id", uid!),
        supabase.from("wallet_transactions").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        wallet: wallet.data,
        profile: profile.data,
        purchases: purchases.data ?? [],
        refs: refs.data ?? [],
        txns: txns.data ?? [],
      };
    },
  });

  const balance = data?.wallet?.balance_ngn ?? 0;
  const lifetime = data?.wallet?.lifetime_earnings_ngn ?? 0;
  const withdrawn = data?.wallet?.total_withdrawals_ngn ?? 0;
  const activeCount = data?.refs.filter((r) => r.status === "pending").length ?? 0;
  const rewardedCount = data?.refs.filter((r) => r.status === "rewarded").length ?? 0;
  const refCode = data?.profile?.referral_code ?? "";
  const refLink = referralLink(refCode);

  const activeTier = data?.purchases.find((p) => p.cycle_status === "active");

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      {/* Welcome */}
      <div className="glass-strong rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Welcome back</div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">
              {data?.profile?.full_name || user?.email?.split("@")[0]} 👋
            </h1>
            {activeTier ? (
              <div className="mt-2 inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full gradient-primary text-primary-foreground">
                <BadgeCheck className="w-4 h-4" /> {activeTier.tiers?.name} tier active
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">No active tier yet.</div>
            )}
          </div>
          {!activeTier && (
            <Button asChild className="gradient-primary text-primary-foreground shadow-glow rounded-xl">
              <Link to="/dashboard/tiers">Buy a tier <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Wallet balance" value={formatNGN(balance)} tint="primary" />
        <StatCard icon={TrendingUp} label="Lifetime earnings" value={formatNGN(lifetime)} />
        <StatCard icon={Users} label="Active referrals" value={String(activeCount)} />
        <StatCard icon={Layers} label="Total withdrawn" value={formatNGN(withdrawn)} />
      </div>

      {/* Referral card */}
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg">Your referral link</h2>
            <p className="text-sm text-muted-foreground">Share and earn on every tier purchase.</p>
          </div>
          <div className="text-xs text-muted-foreground">Code: <b className="text-foreground">{refCode || "—"}</b></div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 glass rounded-xl px-3 py-2.5 text-sm truncate">{refLink || "Loading…"}</div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              if (!refLink) return;
              navigator.clipboard.writeText(refLink);
              toast.success("Copied");
            }}
          >
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="font-semibold">{activeCount}</div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-muted-foreground">Rewarded</div>
            <div className="font-semibold">{rewardedCount}</div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-muted-foreground">Tier cap</div>
            <div className="font-semibold">{activeTier?.tiers?.max_referrals ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction to="/dashboard/tiers" icon={Layers} label="Buy tier" />
          <QuickAction to="/dashboard/wallet" icon={Wallet} label="Withdraw" />
          <QuickAction to="/dashboard/referrals" icon={Users} label="Referrals" />
          <QuickAction to="/blog" icon={BadgeCheck} label="Blog" />
          <QuickAction to="/courses" icon={GraduationCap} label="Courses" />
          <QuickAction to="/products" icon={Package} label="Products" />
          <QuickAction to="/services" icon={Wrench} label="Book service" />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-3">Recent transactions</h2>
        {data?.txns.length ? (
          <div className="divide-y divide-border">
            {data.txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium capitalize">{t.type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className={`font-semibold ${Number(t.amount_ngn) >= 0 ? "text-success" : "text-destructive"}`}>
                  {Number(t.amount_ngn) >= 0 ? "+" : ""}{formatNGN(t.amount_ngn)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-6 text-center">No transactions yet.</div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tint,
}: { icon: typeof Wallet; label: string; value: string; tint?: "primary" }) {
  return (
    <div className={`rounded-2xl p-4 ${tint === "primary" ? "gradient-navy text-navy-foreground" : "glass"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 grid place-items-center rounded-xl ${tint === "primary" ? "bg-white/10" : "gradient-primary text-primary-foreground"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-xs mt-3 ${tint === "primary" ? "text-navy-foreground/70" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-xl md:text-2xl font-display font-bold">{value}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Wallet; label: string }) {
  return (
    <Link to={to} className="glass rounded-2xl p-4 hover:shadow-glow transition flex flex-col items-start gap-3">
      <div className="w-9 h-9 grid place-items-center rounded-xl gradient-primary text-primary-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
