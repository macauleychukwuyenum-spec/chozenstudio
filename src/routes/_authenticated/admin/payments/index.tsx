import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/audit";
import { Download } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/payments/")({
  component: AdminPayments,
});

function AdminPayments() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data } = useQuery({
    queryKey: ["admin-payments", q, status],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*, tier:tiers(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (q) query = query.ilike("paystack_reference", `%${q}%`);
      if (status !== "all") query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((p) => p.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((p) => ({ ...p, user: profileMap.get(p.user_id) }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 flex flex-col md:flex-row gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference..." className="flex-1" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass rounded-lg px-3 py-2 text-sm bg-transparent">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <Button size="sm" variant="outline" onClick={() => downloadCSV("payments.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-1" />CSV
        </Button>
      </div>
      <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2 pr-4">Reference</th><th className="pr-4">User</th><th className="pr-4">Tier</th><th className="pr-4">Amount</th><th className="pr-4">Status</th><th>Date</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((p: any) => (
              <tr key={p.id}>
                <td className="py-3 pr-4 font-mono text-xs">{p.paystack_reference}</td>
                <td className="py-3 pr-4">{p.user?.full_name || p.user?.email || p.user_id}</td>
                <td className="py-3 pr-4">{p.tier?.name ?? "-"}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{formatNGN(p.amount_ngn)}</td>
                <td className="py-3 pr-4"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "success" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : p.status === "failed" ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-muted"}`}>{p.status}</span></td>
                <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <div className="py-10 text-center text-sm text-muted-foreground">No payments.</div>}
      </div>
    </div>
  );
}
