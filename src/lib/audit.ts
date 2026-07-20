import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  action: string;
  target_type?: string;
  target_id?: string;
  before_data?: any;
  after_data?: any;
  metadata?: any;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return;
    await supabase.from("audit_logs").insert({
      admin_id: u.id,
      admin_email: u.email ?? null,
      action: params.action,
      target_type: params.target_type ?? null,
      target_id: params.target_id ?? null,
      before_data: params.before_data ?? null,
      after_data: params.after_data ?? null,
      metadata: params.metadata ?? { ua: typeof navigator !== "undefined" ? navigator.userAgent : null },
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

export function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const keySet = new Set<string>();
  rows.forEach((r) => Object.keys(r ?? {}).forEach((k) => keySet.add(k)));
  const keys = Array.from(keySet);
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadCSV(filename: string, rows: any[]) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
