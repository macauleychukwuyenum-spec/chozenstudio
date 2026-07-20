import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { downloadCSV } from "@/lib/audit";
import { Download, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data } = useQuery({
    queryKey: ["admin-users", q, status],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%,referral_code.ilike.%${q}%`);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">Users</h2>
          <p className="text-xs text-muted-foreground">{data?.length ?? 0} shown</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center lg:min-w-[620px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, code..." className="pl-9" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass rounded-lg px-3 py-2 text-sm bg-transparent">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="frozen">Frozen</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => downloadCSV("users.csv", data ?? [])}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="pr-4">Email</th>
              <th className="pr-4">Phone</th>
              <th className="pr-4">Code</th>
              <th className="pr-4">Status</th>
              <th className="pr-4">Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((u: any) => (
              <tr key={u.id} className="align-top">
                <td className="py-3 pr-4 min-w-[160px] font-medium">{u.full_name || "-"}</td>
                <td className="py-3 pr-4 min-w-[220px]">{u.email}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{u.phone || "-"}</td>
                <td className="py-3 pr-4 font-mono">{u.referral_code}</td>
                <td className="py-3 pr-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${u.status === "active" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : u.status === "suspended" ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-sky-500/15 text-sky-600 dark:text-sky-300"}`}>
                    {u.status}{u.login_disabled ? " - login off" : ""}
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-3 text-right">
                  <Link to="/admin/users/$id" params={{ id: u.id }} className="text-primary text-xs hover:underline">Open -&gt;</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <div className="py-10 text-center text-sm text-muted-foreground">No users match.</div>}
      </div>
    </div>
  );
}
