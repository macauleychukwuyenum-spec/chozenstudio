import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/audit";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/reports/")({
  component: AdminReports,
});

const REPORTS: { key: string; label: string; table: string; dateCol?: string; select?: string }[] = [
  { key: "users", label: "Users", table: "profiles", dateCol: "created_at" },
  { key: "tier_sales", label: "Tier sales", table: "tier_purchases", dateCol: "purchased_at" },
  { key: "referrals", label: "Referral rewards", table: "referrals", dateCol: "created_at" },
  { key: "wallet_tx", label: "Wallet transactions", table: "wallet_transactions", dateCol: "created_at" },
  { key: "withdrawals", label: "Withdrawals", table: "withdrawals", dateCol: "requested_at" },
  { key: "courses", label: "Courses", table: "courses", dateCol: "created_at" },
  { key: "products", label: "Digital products", table: "digital_products", dateCol: "created_at" },
  { key: "bookings", label: "Service bookings", table: "service_bookings", dateCol: "created_at" },
  { key: "blog", label: "Blog posts", table: "blog_posts", dateCol: "created_at" },
  { key: "payments", label: "Payments", table: "payments", dateCol: "created_at" },
];

function AdminReports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function download(r: typeof REPORTS[number]) {
    let q = supabase.from(r.table as any).select("*").limit(5000);
    if (from && r.dateCol) q = q.gte(r.dateCol, from);
    if (to && r.dateCol) q = q.lte(r.dateCol, to);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.info("No rows for that range");
    downloadCSV(`${r.key}-${new Date().toISOString().slice(0, 10)}.csv`, data as any[]);
  }

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 grid md:grid-cols-3 gap-2">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="text-xs text-muted-foreground md:col-span-1 flex items-end">CSV export; open in Excel or Sheets. PDF export can be done from the printed CSV.</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <div key={r.key} className="glass-strong rounded-2xl p-5 flex items-center justify-between">
            <div className="font-medium">{r.label}</div>
            <Button size="sm" variant="outline" onClick={() => download(r)}><Download className="w-3 h-3 mr-1" />CSV</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
