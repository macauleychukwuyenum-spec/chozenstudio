import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  Shield, Users, Layers, Wallet, MessageSquare, Package, BookOpen,
  CreditCard, GraduationCap, Download, Megaphone, Settings, ScrollText, BarChart3, Share2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type NavItem = { to: any; label: string; icon: typeof Shield; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: Shield, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/tiers", label: "Tiers", icon: Layers },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/courses", label: "Courses", icon: GraduationCap },
  { to: "/admin/products", label: "Products", icon: Download },
  { to: "/admin/bookings", label: "Bookings", icon: Package },
  { to: "/admin/blog", label: "Blog", icon: BookOpen },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { isAdmin } = useAuth();
  const loc = useLocation();

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-xl font-display font-bold">Admins only</h1>
          <p className="text-sm text-muted-foreground mt-2">You don't have access to this area.</p>
          <Link to="/dashboard" className="text-sm text-primary hover:underline mt-4 inline-block">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage Chozen Studio.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
        {NAV.map((n) => {
          const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                active ? "gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-accent"
              }`}
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
