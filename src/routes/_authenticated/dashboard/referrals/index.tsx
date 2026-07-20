import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Copy, Users, Share2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { referralLink } from "@/lib/referral";

export const Route = createFileRoute("/_authenticated/dashboard/referrals/")({
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data } = useQuery({
    queryKey: ["referrals-page", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [profile, refs, cycles] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", uid!).maybeSingle(),
        supabase.from("referrals").select("*").eq("referrer_id", uid!).order("created_at", { ascending: false }),
        supabase.from("tier_purchases").select("*, tiers(name, slug, max_referrals)").eq("user_id", uid!).order("purchased_at", { ascending: false }),
      ]);
      return { code: profile.data?.referral_code, refs: refs.data ?? [], cycles: cycles.data ?? [] };
    },
  });

  const code = data?.code ?? "";
  const link = referralLink(code);
  const pending = data?.refs.filter((r) => r.status === "pending").length ?? 0;
  const rewarded = data?.refs.filter((r) => r.status === "rewarded").length ?? 0;
  const total = data?.refs.reduce((s, r) => s + Number(r.reward_amount_ngn || 0), 0) ?? 0;
  const totalRefs = data?.refs.length ?? 0;
  const completedCycles = data?.cycles.filter((c: any) => c.cycle_status === "completed").length ?? 0;
  const activeCycles = data?.cycles.filter((c: any) => c.cycle_status === "active") ?? [];

  async function copy() { await navigator.clipboard.writeText(link); toast.success("Referral link copied"); }
  async function share() {
    if ((navigator as any).share) { try { await (navigator as any).share({ title: "Join Chozen Studio", url: link }); } catch {} }
    else copy();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      <div className="glass-strong rounded-2xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground grid place-items-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-2xl">Your referrals</h1>
            <p className="text-sm text-muted-foreground">
              Share your link. Earn when they buy a Chozen Tier. Rewards credit to your active cycle up to its cap.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 glass rounded-xl px-3 py-2.5 text-sm truncate">{link || "Loading…"}</div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 sm:flex-none" onClick={copy}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button className="rounded-xl gradient-primary text-primary-foreground shadow-glow flex-1 sm:flex-none" onClick={share}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Total" value={totalRefs} />
          <Stat label="Rewarded" value={rewarded} />
          <Stat label="Pending" value={pending} />
          <Stat label="Cycles done" value={completedCycles} />
          <Stat label="Earned" value={formatNGN(total)} />
        </div>
      </div>

      {/* Active cycles */}
      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Active earning cycles</h2>
        {activeCycles.length ? (
          <div className="mt-3 space-y-3">
            {activeCycles.map((c: any) => {
              const cap = Number(c.tiers?.max_referrals ?? 0);
              const used = Number(c.rewarded_referrals_count);
              const remaining = Math.max(0, cap - used);
              const pct = Math.min(100, (used / Math.max(cap, 1)) * 100);
              return (
                <div key={c.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-medium">{c.tiers?.name}</div>
                    <div className="text-xs text-muted-foreground">{used} / {cap} rewarded · {remaining} slots left</div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            No active cycle. Purchase or renew a tier to start earning referral rewards.{" "}
            <Link to="/dashboard/tiers" className="text-primary underline">See tiers →</Link>
          </div>
        )}

        {completedCycles > 0 && (
          <div className="mt-4 glass rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              You have <b>{completedCycles}</b> completed cycle{completedCycles > 1 ? "s" : ""}. Renew a tier to start a new earning cycle — your history and benefits stay intact.
              <div className="mt-2"><Button asChild size="sm" className="gradient-primary text-primary-foreground"><Link to="/dashboard/tiers">Renew a tier</Link></Button></div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display font-bold">History</h2>
        <div className="mt-3 divide-y divide-border">
          {data?.refs.length ? data.refs.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 text-sm gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground truncate">{r.referred_user_id.slice(0, 8)}…</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold">{formatNGN(r.reward_amount_ngn)}</span>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${r.status === "rewarded" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {r.status}
                </span>
              </div>
            </div>
          )) : <div className="py-6 text-center text-sm text-muted-foreground">No referrals yet — share your link to get started.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-display font-bold truncate">{value}</div>
    </div>
  );
}
