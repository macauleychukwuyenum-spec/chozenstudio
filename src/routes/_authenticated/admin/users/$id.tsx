import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { formatNGN } from "@/lib/format";
import { SITE_ORIGIN } from "@/lib/referral";
import { ArrowLeft, Save, Wallet, ShieldAlert, Snowflake, Ban, CheckCircle2, KeyRound } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: user, refetch } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["admin-user-wallet", id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", id).maybeSingle()).data,
  });

  const { data: purchases } = useQuery({
    queryKey: ["admin-user-purchases", id],
    queryFn: async () => (await supabase.from("tier_purchases").select("*, tiers(name)").eq("user_id", id).order("purchased_at", { ascending: false })).data,
  });

  const { data: referrals } = useQuery({
    queryKey: ["admin-user-refs", id],
    queryFn: async () => (await supabase.from("referrals").select("*").eq("referrer_id", id).order("created_at", { ascending: false })).data,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["admin-user-wd", id],
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", id).order("requested_at", { ascending: false })).data,
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-user-bk", id],
    queryFn: async () => (await supabase.from("service_bookings").select("*, services(title)").eq("user_id", id).order("created_at", { ascending: false })).data,
  });

  const { data: blogs } = useQuery({
    queryKey: ["admin-user-blog", id],
    queryFn: async () => (await supabase.from("blog_posts").select("id,title,status,created_at").eq("author_id", id).order("created_at", { ascending: false })).data,
  });

  const [creditAmt, setCreditAmt] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [notes, setNotes] = useState(user?.admin_notes ?? "");

  async function setStatus(status: string) {
    const confirmMsg = `Set status to "${status}"?`;
    if (!confirm(confirmMsg)) return;
    const before = { status: user?.status };
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ action: "user.set_status", target_type: "user", target_id: id, before_data: before, after_data: { status } });
    toast.success("Updated");
    refetch();
  }

  async function toggleLogin(disabled: boolean) {
    if (!confirm(disabled ? "Disable login for this user?" : "Enable login?")) return;
    const { error } = await supabase.from("profiles").update({ login_disabled: disabled }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ action: disabled ? "user.disable_login" : "user.enable_login", target_type: "user", target_id: id });
    toast.success("Updated"); refetch();
  }

  async function toggleVerified() {
    const { error } = await supabase.from("profiles").update({ verified: !user?.verified }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ action: user?.verified ? "user.unverify" : "user.verify", target_type: "user", target_id: id });
    toast.success("Updated"); refetch();
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch = {
      full_name: String(f.get("full_name") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""),
      admin_notes: String(f.get("admin_notes") ?? ""),
    };
    const before = { full_name: user?.full_name, email: user?.email, phone: user?.phone };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ action: "user.edit", target_type: "user", target_id: id, before_data: before, after_data: patch });
    toast.success("Saved"); refetch();
  }

  async function sendReset() {
    if (!user?.email) return;
    if (!confirm(`Send password reset to ${user.email}?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${SITE_ORIGIN}/reset-password`,
    });
    if (error) return toast.error(error.message);
    await logAudit({ action: "user.reset_password", target_type: "user", target_id: id });
    toast.success("Reset email sent");
  }

  async function adjustWallet(sign: 1 | -1) {
    const amt = Number(creditAmt);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    if (!confirm(`${sign > 0 ? "Credit" : "Debit"} ${formatNGN(amt)} to wallet?`)) return;
    const cur = wallet ?? { balance_ngn: 0, lifetime_earnings_ngn: 0, total_withdrawals_ngn: 0 };
    const next = {
      balance_ngn: Number(cur.balance_ngn) + sign * amt,
      lifetime_earnings_ngn: sign > 0 ? Number(cur.lifetime_earnings_ngn) + amt : Number(cur.lifetime_earnings_ngn),
      updated_at: new Date().toISOString(),
    };
    if (wallet) {
      const { error } = await supabase.from("wallets").update(next).eq("user_id", id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("wallets").insert({ user_id: id, ...next });
      if (error) return toast.error(error.message);
    }
    await supabase.from("wallet_transactions").insert({
      user_id: id,
      type: "adjustment",
      amount_ngn: sign * amt,
      description: creditNote || (sign > 0 ? "Admin credit" : "Admin debit"),
    });
    await supabase.from("notifications").insert({
      user_id: id,
      title: sign > 0 ? "Wallet credited" : "Wallet debited",
      body: `${formatNGN(amt)} — ${creditNote || "Admin adjustment"}`,
    });
    await logAudit({ action: sign > 0 ? "wallet.credit" : "wallet.debit", target_type: "user", target_id: id, metadata: { amount: amt, note: creditNote } });
    toast.success("Wallet updated"); setCreditAmt(""); setCreditNote("");
    qc.invalidateQueries({ queryKey: ["admin-user-wallet", id] });
  }

  if (!user) return <div className="glass-strong rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Link to="/admin/users" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back to users
      </Link>

      <div className="grid lg:grid-cols-3 gap-4">
        <form onSubmit={saveProfile} className="glass-strong rounded-2xl p-6 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg">{user.full_name || user.email}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.verified ? "bg-emerald-500/20 text-emerald-400" : "bg-muted"}`}>
              {user.verified ? "Verified" : "Unverified"}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Full name" name="full_name" defaultValue={user.full_name ?? ""} />
            <Field label="Email" name="email" defaultValue={user.email ?? ""} />
            <Field label="Phone" name="phone" defaultValue={user.phone ?? ""} />
            <Field label="Referral code" name="ref" defaultValue={user.referral_code} disabled />
          </div>
          <div className="space-y-2">
            <Label>Admin notes</Label>
            <Textarea name="admin_notes" defaultValue={user.admin_notes ?? ""} rows={3} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" size="sm" className="gradient-primary text-primary-foreground"><Save className="w-3 h-3 mr-1" /> Save</Button>
        </form>

        <div className="glass-strong rounded-2xl p-6 space-y-3">
          <div className="text-sm font-semibold">Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={toggleVerified}><CheckCircle2 className="w-3 h-3 mr-1" />{user.verified ? "Unverify" : "Verify"}</Button>
            <Button size="sm" variant="outline" onClick={sendReset}><KeyRound className="w-3 h-3 mr-1" />Reset pw</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("frozen")}><Snowflake className="w-3 h-3 mr-1" />Freeze</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("active")}><CheckCircle2 className="w-3 h-3 mr-1" />Unfreeze/Reactivate</Button>
            <Button size="sm" variant="destructive" onClick={() => setStatus("suspended")}><Ban className="w-3 h-3 mr-1" />Suspend</Button>
            {user.login_disabled ? (
              <Button size="sm" variant="outline" onClick={() => toggleLogin(false)}>Enable login</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => toggleLogin(true)}>Disable login</Button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> Wallet</div>
            <div className="text-2xl font-display font-bold">{formatNGN(wallet?.balance_ngn ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Lifetime: {formatNGN(wallet?.lifetime_earnings_ngn ?? 0)} · Withdrawn: {formatNGN(wallet?.total_withdrawals_ngn ?? 0)}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Amount NGN" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
          <Input placeholder="Note" value={creditNote} onChange={(e) => setCreditNote(e.target.value)} className="md:col-span-1" />
          <div className="flex gap-2">
            <Button size="sm" className="gradient-primary text-primary-foreground flex-1" onClick={() => adjustWallet(1)}>Credit</Button>
            <Button size="sm" variant="destructive" className="flex-1" onClick={() => adjustWallet(-1)}>Debit</Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniList title="Purchases" rows={(purchases ?? []).map((p: any) => ({ a: p.tiers?.name, b: formatNGN(p.amount_paid_ngn), c: new Date(p.purchased_at).toLocaleDateString(), d: p.cycle_status }))} />
        <MiniList title="Referrals" rows={(referrals ?? []).map((r: any) => ({ a: r.status, b: formatNGN(r.reward_amount_ngn ?? 0), c: new Date(r.created_at).toLocaleDateString(), d: "" }))} />
        <MiniList title="Withdrawals" rows={(withdrawals ?? []).map((w: any) => ({ a: formatNGN(w.amount_ngn), b: w.status, c: new Date(w.requested_at).toLocaleDateString(), d: w.bank_name }))} />
        <MiniList title="Bookings" rows={(bookings ?? []).map((b: any) => ({ a: b.services?.title, b: b.status, c: new Date(b.created_at).toLocaleDateString(), d: "" }))} />
        <MiniList title="Blog posts" rows={(blogs ?? []).map((b: any) => ({ a: b.title, b: b.status, c: new Date(b.created_at).toLocaleDateString(), d: "" }))} />
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, disabled }: any) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue} disabled={disabled} />
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: { a: any; b: any; c: any; d: any }[] }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {rows.length ? (
        <div className="divide-y divide-border text-sm">
          {rows.slice(0, 8).map((r, i) => (
            <div key={i} className="py-2 flex items-center justify-between gap-2">
              <div className="truncate">{r.a}</div>
              <div className="text-xs text-muted-foreground shrink-0">{r.b} · {r.c}{r.d ? ` · ${r.d}` : ""}</div>
            </div>
          ))}
        </div>
      ) : <div className="text-xs text-muted-foreground py-4 text-center">Nothing yet.</div>}
    </div>
  );
}
