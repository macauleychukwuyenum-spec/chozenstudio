import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import {
  Users, DollarSign, Layers, Wallet, UserPlus, Ban, Snowflake, ShoppingCart, TrendingUp,
  CalendarDays, GraduationCap, Download, BookOpen, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { subDays, startOfDay, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const RANGES = [
  { key: "7", label: "7d", days: 7 },
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "365", label: "1y", days: 365 },
] as const;

function AdminOverview() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const since = useMemo(() => startOfDay(subDays(new Date(), range.days)).toISOString(), [range]);

  const { data } = useQuery({
    queryKey: ["admin-overview", range.key],
    queryFn: async () => {
      const [
        users, purchasesAll, purchasesRange, withdrawalsAll, bookings, courses, products, blog,
        walletsAgg, referrals, notifications,
      ] = await Promise.all([
        supabase.from("profiles").select("id, status, login_disabled, created_at"),
        supabase.from("tier_purchases").select("amount_paid_ngn, purchased_at, tier_id"),
        supabase.from("tier_purchases").select("amount_paid_ngn, purchased_at, tier_id").gte("created_at", since),
        supabase.from("withdrawals").select("amount_ngn, status, requested_at"),
        supabase.from("service_bookings").select("id, status, created_at"),
        supabase.from("courses").select("id"),
        supabase.from("digital_products").select("id"),
        supabase.from("blog_posts").select("id, status"),
        supabase.from("wallets").select("balance_ngn"),
        supabase.from("referrals").select("id, status, created_at"),
        supabase.from("notifications").select("id"),
      ]);

      const todayStart = startOfDay(new Date()).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const totalRevenue = (purchasesAll.data ?? []).reduce((s, p) => s + Number(p.amount_paid_ngn), 0);
      const monthRevenue = (purchasesAll.data ?? []).filter((p) => p.purchased_at >= monthStart).reduce((s, p) => s + Number(p.amount_paid_ngn), 0);
      const todayRevenue = (purchasesAll.data ?? []).filter((p) => p.purchased_at >= todayStart).reduce((s, p) => s + Number(p.amount_paid_ngn), 0);

      // Build daily buckets for range
      const bucket: Record<string, { day: string; revenue: number; purchases: number; users: number; referrals: number; withdrawals: number; bookings: number }> = {};
      for (let i = 0; i < range.days; i++) {
        const d = format(subDays(new Date(), range.days - 1 - i), "yyyy-MM-dd");
        bucket[d] = { day: d, revenue: 0, purchases: 0, users: 0, referrals: 0, withdrawals: 0, bookings: 0 };
      }
      (purchasesRange.data ?? []).forEach((p) => {
        const d = format(new Date(p.purchased_at), "yyyy-MM-dd");
        if (bucket[d]) { bucket[d].revenue += Number(p.amount_paid_ngn); bucket[d].purchases += 1; }
      });
      (users.data ?? []).forEach((u) => {
        const d = format(new Date(u.created_at), "yyyy-MM-dd");
        if (bucket[d]) bucket[d].users += 1;
      });
      (referrals.data ?? []).forEach((r) => {
        const d = format(new Date(r.created_at), "yyyy-MM-dd");
        if (bucket[d]) bucket[d].referrals += 1;
      });
      (withdrawalsAll.data ?? []).forEach((w) => {
        const d = format(new Date(w.requested_at), "yyyy-MM-dd");
        if (bucket[d]) bucket[d].withdrawals += 1;
      });
      (bookings.data ?? []).forEach((b) => {
        const d = format(new Date(b.created_at), "yyyy-MM-dd");
        if (bucket[d]) bucket[d].bookings += 1;
      });
      const series = Object.values(bucket);

      const usersList = users.data ?? [];
      return {
        totalUsers: usersList.length,
        activeUsers: usersList.filter((u) => u.status === "active" && !u.login_disabled).length,
        suspendedUsers: usersList.filter((u) => u.status === "suspended").length,
        frozenUsers: usersList.filter((u) => u.status === "frozen").length,
        newToday: usersList.filter((u) => u.created_at >= todayStart).length,
        totalRevenue,
        monthRevenue,
        todayRevenue,
        totalPurchases: purchasesAll.data?.length ?? 0,
        activeHolders: new Set((purchasesAll.data ?? []).map((p) => p.tier_id)).size,
        totalRewardsPaid: (withdrawalsAll.data ?? []).filter((w) => w.status === "paid").reduce((s, w) => s + Number(w.amount_ngn), 0),
        walletBalance: (walletsAgg.data ?? []).reduce((s, w) => s + Number(w.balance_ngn), 0),
        pendingW: (withdrawalsAll.data ?? []).filter((w) => w.status === "pending").length,
        approvedW: (withdrawalsAll.data ?? []).filter((w) => w.status === "approved").length,
        paidW: (withdrawalsAll.data ?? []).filter((w) => w.status === "paid").length,
        pendingBookings: (bookings.data ?? []).filter((b) => ["pending", "new"].includes(b.status)).length,
        completedBookings: (bookings.data ?? []).filter((b) => b.status === "completed").length,
        totalCourses: courses.data?.length ?? 0,
        totalProducts: products.data?.length ?? 0,
        totalBlogs: blog.data?.length ?? 0,
        pendingBlogs: (blog.data ?? []).filter((b) => b.status === "pending").length,
        totalNotifications: notifications.data?.length ?? 0,
        series,
      };
    },
  });

  const kpis = [
    { icon: Users, label: "Total users", value: String(data?.totalUsers ?? 0) },
    { icon: CheckCircle2, label: "Active users", value: String(data?.activeUsers ?? 0) },
    { icon: Ban, label: "Suspended", value: String(data?.suspendedUsers ?? 0) },
    { icon: Snowflake, label: "Frozen", value: String(data?.frozenUsers ?? 0) },
    { icon: UserPlus, label: "New today", value: String(data?.newToday ?? 0) },
    { icon: DollarSign, label: "Total revenue", value: formatNGN(data?.totalRevenue ?? 0) },
    { icon: TrendingUp, label: "This month", value: formatNGN(data?.monthRevenue ?? 0) },
    { icon: CalendarDays, label: "Today", value: formatNGN(data?.todayRevenue ?? 0) },
    { icon: ShoppingCart, label: "Tier sales", value: String(data?.totalPurchases ?? 0) },
    { icon: Layers, label: "Active tier holders", value: String(data?.activeHolders ?? 0) },
    { icon: Wallet, label: "Rewards paid", value: formatNGN(data?.totalRewardsPaid ?? 0) },
    { icon: Wallet, label: "Platform balance", value: formatNGN(data?.walletBalance ?? 0) },
    { icon: Clock, label: "Pending withdrawals", value: String(data?.pendingW ?? 0) },
    { icon: CheckCircle2, label: "Approved withdrawals", value: String(data?.approvedW ?? 0) },
    { icon: CheckCircle2, label: "Paid withdrawals", value: String(data?.paidW ?? 0) },
    { icon: Clock, label: "Pending bookings", value: String(data?.pendingBookings ?? 0) },
    { icon: CheckCircle2, label: "Completed bookings", value: String(data?.completedBookings ?? 0) },
    { icon: GraduationCap, label: "Courses", value: String(data?.totalCourses ?? 0) },
    { icon: Download, label: "Products", value: String(data?.totalProducts ?? 0) },
    { icon: BookOpen, label: "Blog posts", value: String(data?.totalBlogs ?? 0) },
    { icon: XCircle, label: "Pending blog reviews", value: String(data?.pendingBlogs ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${range.key === r.key ? "gradient-primary text-primary-foreground" : "glass"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((c) => (
          <div key={c.label} className="glass-strong rounded-2xl p-4">
            <div className="w-8 h-8 grid place-items-center rounded-lg gradient-primary text-primary-foreground">
              <c.icon className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">{c.label}</div>
            <div className="text-lg md:text-xl font-display font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" hide />
              <YAxis width={40} />
              <Tooltip formatter={(v: any) => formatNGN(Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="User growth">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" hide /><YAxis width={30} /><Tooltip />
              <Bar dataKey="users" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Referrals">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" hide /><YAxis width={30} /><Tooltip />
              <Bar dataKey="referrals" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Bookings & Withdrawals">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" hide /><YAxis width={30} /><Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="withdrawals" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
