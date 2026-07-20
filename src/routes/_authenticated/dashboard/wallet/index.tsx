import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet as WalletIcon, TrendingUp, ArrowUpRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/wallet/")({
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["wallet-page", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [wallet, txns, withdrawals] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", uid!).maybeSingle(),
        supabase.from("wallet_transactions").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(20),
        supabase.from("withdrawals").select("*").eq("user_id", uid!).order("requested_at", { ascending: false }).limit(10),
      ]);
      return { wallet: wallet.data, txns: txns.data ?? [], withdrawals: withdrawals.data ?? [] };
    },
  });

  const balance = Number(data?.wallet?.balance_ngn ?? 0);

  async function onWithdraw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (amount > balance) return toast.error("Amount exceeds balance");
    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: uid!,
      amount_ngn: amount,
      bank_name: String(form.get("bank_name")),
      account_number: String(form.get("account_number")),
      account_name: String(form.get("account_name")),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal request submitted. Admin will process shortly.");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["wallet-page"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-2xl p-6 gradient-navy text-navy-foreground">
          <div className="flex items-center gap-2 text-navy-foreground/70 text-sm">
            <WalletIcon className="w-4 h-4" /> Available balance
          </div>
          <div className="text-4xl md:text-5xl font-display font-bold mt-2">{formatNGN(balance)}</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-navy-foreground/70">Lifetime earnings</div>
              <div className="font-semibold">{formatNGN(data?.wallet?.lifetime_earnings_ngn ?? 0)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-navy-foreground/70">Total withdrawn</div>
              <div className="font-semibold">{formatNGN(data?.wallet?.total_withdrawals_ngn ?? 0)}</div>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground grid place-items-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <h3 className="mt-3 font-display font-bold">Withdraw funds</h3>
            <p className="text-sm text-muted-foreground mt-1">Requests are reviewed and paid manually by admin.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={balance <= 0} className="mt-5 rounded-xl gradient-primary text-primary-foreground shadow-glow">
                Request withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>Withdraw funds</DialogTitle>
                <DialogDescription>Enter your bank details. Admin will process within 24–72 hours.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onWithdraw} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input id="amount" name="amount" type="number" min={1} max={balance} required />
                  <div className="text-xs text-muted-foreground">Available: {formatNGN(balance)}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank name</Label>
                  <Input id="bank_name" name="bank_name" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account number</Label>
                    <Input id="account_number" name="account_number" required maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account name</Label>
                    <Input id="account_name" name="account_name" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground shadow-glow rounded-xl">
                    {submitting ? "Submitting…" : "Submit request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-display font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Transactions</h3>
          <div className="mt-3 divide-y divide-border">
            {data?.txns.length ? data.txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="capitalize font-medium">{t.type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className={Number(t.amount_ngn) >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                  {Number(t.amount_ngn) >= 0 ? "+" : ""}{formatNGN(t.amount_ngn)}
                </div>
              </div>
            )) : <div className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</div>}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-display font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Withdrawals</h3>
          <div className="mt-3 divide-y divide-border">
            {data?.withdrawals.length ? data.withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{formatNGN(w.amount_ngn)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(w.requested_at).toLocaleString()}</div>
                </div>
                <StatusPill status={w.status} />
              </div>
            )) : <div className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-primary/15 text-primary",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-xs px-2 py-1 rounded-full capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
