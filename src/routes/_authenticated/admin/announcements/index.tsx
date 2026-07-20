import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Megaphone, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/announcements/")({
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const qc = useQueryClient();
  const { data: tiers } = useQuery({
    queryKey: ["tiers-list"],
    queryFn: async () => (await supabase.from("tiers").select("id,name")).data,
  });
  const { data } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data,
  });

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const audience = String(f.get("audience"));
    const payload: any = {
      title: String(f.get("title")),
      body: String(f.get("body")),
      type: String(f.get("type")),
      audience,
      tier_id: audience === "tier" ? String(f.get("tier_id") || "") || null : null,
      target_user_id: audience === "user" ? String(f.get("target_user_id") || "") || null : null,
      active: true,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    };
    const { data: ann, error } = await supabase.from("announcements").insert(payload).select().single();
    if (error) return toast.error(error.message);

    // Fanout to notifications
    let targets: string[] = [];
    if (audience === "all") {
      const { data: users } = await supabase.from("profiles").select("id");
      targets = (users ?? []).map((u) => u.id);
    } else if (audience === "tier" && payload.tier_id) {
      const { data: purch } = await supabase.from("tier_purchases").select("user_id").eq("tier_id", payload.tier_id);
      targets = Array.from(new Set((purch ?? []).map((p) => p.user_id)));
    } else if (audience === "user" && payload.target_user_id) {
      targets = [payload.target_user_id];
    }
    if (targets.length) {
      const rows = targets.map((uid) => ({ user_id: uid, title: payload.title, body: payload.body }));
      // chunk into 500
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("notifications").insert(rows.slice(i, i + 500));
      }
    }
    await logAudit({ action: "announcement.create", target_type: "announcement", target_id: ann.id, after_data: { ...payload, recipients: targets.length } });
    toast.success(`Broadcast to ${targets.length} user${targets.length === 1 ? "" : "s"}`);
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  async function remove(a: any) {
    if (!confirm("Delete announcement?")) return;
    await supabase.from("announcements").delete().eq("id", a.id);
    await logAudit({ action: "announcement.delete", target_type: "announcement", target_id: a.id });
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={create} className="glass-strong rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2"><Megaphone className="w-4 h-4" /><h2 className="font-display font-bold">New announcement</h2></div>
        <Field label="Title" name="title" required />
        <div className="space-y-2"><Label>Message</Label><Textarea name="body" rows={4} required /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Type</Label>
            <select name="type" defaultValue="info" className="glass rounded-lg px-3 py-2 text-sm bg-transparent w-full">
              <option value="info">Info</option><option value="promotion">Promotion</option><option value="maintenance">Maintenance</option><option value="security">Security</option><option value="course">New course</option><option value="product">New product</option>
            </select>
          </div>
          <div className="space-y-2"><Label>Audience</Label>
            <select name="audience" defaultValue="all" className="glass rounded-lg px-3 py-2 text-sm bg-transparent w-full">
              <option value="all">All users</option><option value="tier">Specific tier</option><option value="user">Specific user (id)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Tier (if tier)</Label>
            <select name="tier_id" className="glass rounded-lg px-3 py-2 text-sm bg-transparent w-full">
              <option value="">—</option>
              {tiers?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Field label="User ID (if user)" name="target_user_id" />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground">Broadcast</Button>
      </form>

      <div className="glass-strong rounded-2xl p-6 space-y-2">
        <h2 className="font-display font-bold mb-2">History</h2>
        <div className="divide-y divide-border">
          {data?.map((a: any) => (
            <div key={a.id} className="py-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.type} · {a.audience} · {new Date(a.created_at).toLocaleDateString()}</div>
                <div className="text-sm mt-1 line-clamp-2">{a.body}</div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => remove(a)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          {!data?.length && <div className="text-sm text-muted-foreground py-6 text-center">No announcements yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, required }: any) {
  return <div className="space-y-2"><Label>{label}</Label><Input name={name} required={required} /></div>;
}
