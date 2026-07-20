import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings/")({
  component: AdminSettings,
});

const GROUPS: { key: string; label: string; fields: { key: string; label: string; type?: string; textarea?: boolean }[] }[] = [
  { key: "general", label: "General", fields: [
    { key: "site_name", label: "Website name" },
    { key: "slogan", label: "Slogan" },
    { key: "logo_url", label: "Logo URL" },
    { key: "favicon_url", label: "Favicon URL" },
    { key: "support_email", label: "Support email" },
    { key: "whatsapp_number", label: "WhatsApp number" },
    { key: "social_links", label: "Social links (JSON)", textarea: true },
  ]},
  { key: "appearance", label: "Appearance", fields: [
    { key: "primary_color", label: "Primary color" },
    { key: "hero_image_url", label: "Homepage banner URL" },
  ]},
  { key: "referrals", label: "Referrals", fields: [
    { key: "referrals_enabled", label: "Enabled (true/false)" },
    { key: "default_commission_pct", label: "Default commission %", type: "number" },
    { key: "referral_rules", label: "Rules", textarea: true },
  ]},
  { key: "withdrawals", label: "Withdrawals", fields: [
    { key: "withdrawals_enabled", label: "Enabled (true/false)" },
    { key: "min_withdrawal_ngn", label: "Minimum NGN", type: "number" },
    { key: "max_withdrawal_ngn", label: "Maximum NGN", type: "number" },
    { key: "min_referrals_for_withdrawal", label: "Min referrals", type: "number" },
    { key: "processing_time_note", label: "Processing time note" },
  ]},
  { key: "payments", label: "Payments", fields: [
    { key: "paystack_public_key", label: "Paystack public key" },
    { key: "currency", label: "Currency" },
  ]},
  { key: "bookings", label: "Bookings", fields: [
    { key: "bookings_enabled", label: "Enabled (true/false)" },
    { key: "consultation_price_ngn", label: "Consultation price", type: "number" },
  ]},
  { key: "blog", label: "Blog", fields: [
    { key: "blog_enabled", label: "Enabled (true/false)" },
    { key: "blog_requires_approval", label: "Requires approval (true/false)" },
  ]},
  { key: "courses", label: "Courses", fields: [
    { key: "certificates_enabled", label: "Certificates (true/false)" },
    { key: "quizzes_enabled", label: "Quizzes (true/false)" },
  ]},
  { key: "security", label: "Security", fields: [
    { key: "session_timeout_min", label: "Session timeout (min)", type: "number" },
    { key: "max_login_attempts", label: "Max login attempts", type: "number" },
  ]},
  { key: "maintenance", label: "Maintenance", fields: [
    { key: "maintenance_mode", label: "Enabled (true/false)" },
    { key: "maintenance_message", label: "Message", textarea: true },
  ]},
];

function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value?.v ?? r.value; });
      return map;
    },
  });

  async function saveGroup(e: React.FormEvent<HTMLFormElement>, group: typeof GROUPS[number]) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patches: any[] = [];
    for (const field of group.fields) {
      const raw = String(f.get(field.key) ?? "");
      let v: any = raw;
      if (field.type === "number") v = raw === "" ? null : Number(raw);
      if (raw === "true") v = true;
      if (raw === "false") v = false;
      patches.push({ key: field.key, value: { v } });
    }
    const { error } = await supabase.from("app_settings").upsert(patches, { onConflict: "key" });
    if (error) return toast.error(error.message);
    await logAudit({ action: `settings.${group.key}`, target_type: "settings", after_data: patches });
    toast.success(`${group.label} saved`);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {GROUPS.map((g) => (
        <form key={g.key} onSubmit={(e) => saveGroup(e, g)} className="glass-strong rounded-2xl p-6 space-y-3">
          <h2 className="font-display font-bold">{g.label}</h2>
          {g.fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              {f.textarea ? (
                <Textarea name={f.key} defaultValue={data?.[f.key] != null ? String(data[f.key]) : ""} rows={3} />
              ) : (
                <Input name={f.key} type={f.type ?? "text"} defaultValue={data?.[f.key] != null ? String(data[f.key]) : ""} />
              )}
            </div>
          ))}
          <Button type="submit" size="sm" className="gradient-primary text-primary-foreground"><Save className="w-3 h-3 mr-1" />Save</Button>
        </form>
      ))}
    </div>
  );
}
