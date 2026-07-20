import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/withdrawals/")({
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data: withdrawals, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (withdrawals ?? []).map((w) => ({ ...w, profile: profileMap.get(w.user_id) }));
    },
  });

  const counts = {
    total: data?.length ?? 0,
    pending: data?.filter((w: any) => w.status === "pending").length ?? 0,
    approved: data?.filter((w: any) => w.status === "approved").length ?? 0,
    paid: data?.filter((w: any) => w.status === "paid").length ?? 0,
  };

  async function updateStatus(w: any, newStatus: "approved" | "paid" | "rejected") {
    const patch: any = {
      status: newStatus,
      processed_at: new Date().toISOString(),
      processed_by: user?.id ?? null,
    };
    const { error: err1 } = await supabase.from("withdrawals").update(patch).eq("id", w.id);
    if (err1) return toast.error(err1.message);

    if (newStatus === "paid") {
      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", w.user_id).maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({
          balance_ngn: Number(wallet.balance_ngn) - Number(w.amount_ngn),
          total_withdrawals_ngn: Number(wallet.total_withdrawals_ngn) + Number(w.amount_ngn),
          updated_at: new Date().toISOString(),
        }).eq("user_id", w.user_id);
      }
      await supabase.from("wallet_transactions").insert({
        user_id: w.user_id,
        type: "withdrawal",
        amount_ngn: -Number(w.amount_ngn),
        description: "Withdrawal paid",
        reference: w.id,
      });
      await supabase.from("notifications").insert({
        user_id: w.user_id,
        title: "Withdrawal paid",
        body: `Your withdrawal of ${formatNGN(w.amount_ngn)} has been paid.`,
      });
    } else if (newStatus === "rejected") {
      await supabase.from("notifications").insert({
        user_id: w.user_id,
        title: "Withdrawal rejected",
        body: `Your withdrawal request of ${formatNGN(w.amount_ngn)} was rejected.`,
      });
    }
    toast.success(`Marked ${newStatus}`);
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  }

  async function deletePaid(w: any) {
    if (w.status !== "paid") return;
    if (!confirm(`Delete paid withdrawal record for ${formatNGN(w.amount_ngn)}?`)) return;
    const { error } = await supabase.from("withdrawals").delete().eq("id", w.id).eq("status", "paid");
    if (error) return toast.error(error.message);
    toast.success("Paid request deleted");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total", counts.total],
          ["Pending", counts.pending],
          ["Approved", counts.approved],
          ["Paid", counts.paid],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-strong rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-display font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-4 md:p-6">
        <h2 className="font-display font-bold mb-4">Withdrawal requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">User</th>
                <th className="pr-4">Amount</th>
                <th className="pr-4">Bank</th>
                <th className="pr-4">Account</th>
                <th className="pr-4">Status</th>
                <th className="pr-4">Requested</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.length ? data.map((w: any) => (
                <tr key={w.id} className="align-top">
                  <td className="py-3 pr-4 min-w-[180px]">
                    <div className="font-medium">{w.profile?.full_name || "Unknown user"}</div>
                    <div className="text-xs text-muted-foreground">{w.profile?.email || w.user_id}</div>
                  </td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">{formatNGN(w.amount_ngn)}</td>
                  <td className="py-3 pr-4 min-w-[140px]">{w.bank_name}</td>
                  <td className="py-3 pr-4 min-w-[170px]">
                    <div>{w.account_number}</div>
                    <div className="text-xs text-muted-foreground">{w.account_name}</div>
                  </td>
                  <td className="py-3 pr-4"><StatusPill status={w.status} /></td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(w.requested_at).toLocaleString()}</td>
                  <td className="py-3">
                    <div className="flex gap-2 justify-end">
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(w, "approved")}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(w, "rejected")}><X className="w-3 h-3" /></Button>
                        </>
                      )}
                      {w.status === "approved" && (
                        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => updateStatus(w, "paid")}>
                          <Check className="w-3 h-3 mr-1" /> Mark paid
                        </Button>
                      )}
                      {w.status === "paid" && (
                        <Button size="sm" variant="destructive" onClick={() => deletePaid(w)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No withdrawal requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "paid" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" :
    status === "approved" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" :
    status === "rejected" ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" :
    "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return <span className={`capitalize text-xs px-2 py-1 rounded-full ${tone}`}>{status}</span>;
}
