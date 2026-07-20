import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/notifications/")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
  }

  async function toggle(id: string, read: boolean) {
    await supabase.from("notifications").update({ read: !read }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}><Check className="w-3 h-3 mr-1" /> Mark all read</Button>
      </div>
      <div className="glass-strong rounded-2xl divide-y divide-border">
        {data?.length ? data.map((n) => (
          <button key={n.id} onClick={() => toggle(n.id, n.read)} className="w-full text-left p-4 flex gap-3 hover:bg-accent/40 transition">
            <div className={`w-2 h-2 mt-2 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} />
            <div className="flex-1">
              <div className="font-medium text-sm">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
              <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </button>
        )) : <div className="p-10 text-center text-sm text-muted-foreground">No notifications yet.</div>}
      </div>
    </div>
  );
}
