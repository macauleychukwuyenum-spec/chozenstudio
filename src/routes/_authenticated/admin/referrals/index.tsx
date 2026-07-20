import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { downloadCSV, logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/referrals/")({
  component: AdminReferrals,
});

function AdminReferrals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const { data } = useQuery({
    queryKey: ["admin-referrals", status],
    queryFn: async () => {
      let q = supabase
        .from("referrals")
        .select("*, tier_purchase:tier_purchases(amount_paid_ngn, tiers(name))")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status !== "all") q = q.eq("status", status as any);
      const { data, error } = await q;
      if (error) throw error;

      const userIds = [
        ...new Set((data ?? []).flatMap((r: any) => [r.referrer_id, r.referred_user_id])),
      ];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email,phone").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((r: any) => ({
        ...r,
        referrer: profileMap.get(r.referrer_id),
        referred: profileMap.get(r.referred_user_id),
      }));
    },
  });

  const dupPhones = new Set<string>();
  const dupEmails = new Set<string>();
  const phoneCount: Record<string, number> = {};
  const emailCount: Record<string, number> = {};
  data?.forEach((r: any) => {
    if (r.referred?.phone) phoneCount[r.referred.phone] = (phoneCount[r.referred.phone] ?? 0) + 1;
    if (r.referred?.email) emailCount[r.referred.email] = (emailCount[r.referred.email] ?? 0) + 1;
  });
  Object.entries(phoneCount).forEach(([k, v]) => v > 1 && dupPhones.add(k));
  Object.entries(emailCount).forEach(([k, v]) => v > 1 && dupEmails.add(k));

  const counts = {
    total: data?.length ?? 0,
    pending: data?.filter((r: any) => r.status === "pending").length ?? 0,
    rewarded: data?.filter((r: any) => r.status === "rewarded").length ?? 0,
    rejected: data?.filter((r: any) => r.status === "rejected").length ?? 0,
  };

  async function decide(r: any, decision: "rewarded" | "rejected") {
    if (!confirm(`${decision === "rewarded" ? "Approve" : "Reject"} this referral?`)) return;
    const patch: any = { status: decision, rewarded_at: decision === "rewarded" ? new Date().toISOString() : null };
    const { error } = await supabase.from("referrals").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);

    if (decision === "rewarded" && Number(r.reward_amount_ngn) > 0) {
      const { data: w } = await supabase.from("wallets").select("*").eq("user_id", r.referrer_id).maybeSingle();
      const amt = Number(r.reward_amount_ngn);
      if (w) {
        await supabase.from("wallets").update({
          balance_ngn: Number(w.balance_ngn) + amt,
          lifetime_earnings_ngn: Number(w.lifetime_earnings_ngn) + amt,
          updated_at: new Date().toISOString(),
        }).eq("user_id", r.referrer_id);
      }
      await supabase.from("wallet_transactions").insert({
        user_id: r.referrer_id,
        type: "referral_reward",
        amount_ngn: amt,
        description: "Referral reward",
        reference: r.id,
      });
      await supabase.from("notifications").insert({
        user_id: r.referrer_id,
        title: "Referral rewarded",
        body: `You earned ${formatNGN(amt)}.`,
      });
    }
    await logAudit({ action: `referral.${decision}`, target_type: "referral", target_id: r.id });
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-referrals"] });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total", counts.total], ["Pending", counts.pending], ["Rewarded", counts.rewarded], ["Rejected", counts.rejected]].map(([l, v]) => (
          <div key={l as string} className="glass-strong rounded-2xl p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-display font-bold">{v}</div></div>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-between">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass rounded-lg px-3 py-2 text-sm bg-transparent">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="rewarded">Rewarded</option>
          <option value="rejected">Rejected</option>
        </select>
        <Button size="sm" variant="outline" onClick={() => downloadCSV("referrals.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-1" />Export
        </Button>
      </div>

      <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Referrer</th>
              <th className="pr-4">Referred</th>
              <th className="pr-4">Tier</th>
              <th className="pr-4">Reward</th>
              <th className="pr-4">Status</th>
              <th className="pr-4">Date</th>
              <th className="pr-4">Flags</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((r: any) => {
              const flags: string[] = [];
              if (r.referred?.phone && dupPhones.has(r.referred.phone)) flags.push("dup phone");
              if (r.referred?.email && dupEmails.has(r.referred.email)) flags.push("dup email");
              return (
                <tr key={r.id} className="align-top">
                  <td className="py-3 pr-4 min-w-[170px]">
                    <div className="font-medium">{r.referrer?.full_name || r.referrer?.email || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{r.referrer?.phone}</div>
                  </td>
                  <td className="py-3 pr-4 min-w-[170px]">
                    <div className="font-medium">{r.referred?.full_name || r.referred?.email || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{r.referred?.phone}</div>
                  </td>
                  <td className="py-3 pr-4">{r.tier_purchase?.tiers?.name ?? "-"}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatNGN(r.reward_amount_ngn)}</td>
                  <td className="py-3 pr-4"><span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{r.status}</span></td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">{flags.length ? <span className="text-xs text-amber-500 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{flags.join(", ")}</span> : <span className="text-xs text-muted-foreground">-</span>}</td>
                  <td className="py-3">
                    {r.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => decide(r, "rewarded")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => decide(r, "rejected")}>Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data?.length && <div className="py-10 text-center text-sm text-muted-foreground">No referrals.</div>}
      </div>
    </div>
  );
}
