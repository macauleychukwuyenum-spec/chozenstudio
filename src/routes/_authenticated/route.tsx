import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { Home, Layers, Wallet, Users, User as UserIcon, LogOut, Shield, Bell, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

type NavItem = { to: any; label: string; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
  { to: "/dashboard/tiers", label: "Tiers", icon: Layers },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/profile", label: "Me", icon: UserIcon },
];

function AuthedLayout() {
  const { user, isAdmin, signOut } = useAuth();
  const loc = useLocation();
  const uid = user?.id;

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-count", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid!)
        .eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col glass-strong border-r border-border sticky top-0 h-screen p-5">
        <Logo />
        <nav className="mt-8 space-y-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/60 transition"
              activeProps={{ className: "!text-foreground gradient-primary !text-primary-foreground shadow-glow" }}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/60"
              activeProps={{ className: "!text-foreground bg-navy !text-navy-foreground" }}
            >
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
          <Link to="/dashboard/blog" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/60">
            <BookOpen className="w-4 h-4" /> Write blog
          </Link>
          <Link to="/dashboard/notifications" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/60 relative">
            <Bell className="w-4 h-4" /> Notifications
            {unread > 0 && <span className="ml-auto text-[10px] rounded-full gradient-primary text-primary-foreground px-1.5 py-0.5">{unread}</span>}
          </Link>
        </nav>
        <div className="border-t border-border pt-4 space-y-2">
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-2 text-sm">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 glass-strong h-14 flex items-center justify-between px-4 border-b border-border">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/dashboard/notifications" className="relative w-9 h-9 grid place-items-center rounded-xl hover:bg-accent/60">
            <Bell className="w-4 h-4" />
            {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.exact
              ? loc.pathname === item.to
              : loc.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`w-9 h-9 grid place-items-center rounded-xl transition ${active ? "gradient-primary text-primary-foreground shadow-glow" : ""}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
