import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/audit";
import { Download } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/audit/")({
  component: AdminAudit,
});

function AdminAudit() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["audit-logs", q],
    queryFn: async () => {
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (q) query = query.or(`action.ilike.%${q}%,admin_email.ilike.%${q}%,target_id.ilike.%${q}%,target_type.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action / admin / target…" className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => downloadCSV("audit_logs.csv", data ?? [])}><Download className="w-4 h-4 mr-1" />CSV</Button>
      </div>
      <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((r: any) => (
              <tr key={r.id}>
                <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="text-xs">{r.admin_email ?? "—"}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="text-xs">{r.target_type ?? ""}{r.target_id ? `:${String(r.target_id).slice(0, 8)}` : ""}</td>
                <td className="text-xs max-w-md truncate">
                  {r.after_data && <span className="text-emerald-400">→ {JSON.stringify(r.after_data).slice(0, 120)}</span>}
                  {r.metadata?.amount && <span className="ml-1 text-amber-400">₦{r.metadata.amount}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <div className="py-10 text-center text-sm text-muted-foreground">No log entries.</div>}
      </div>
    </div>
  );
}
