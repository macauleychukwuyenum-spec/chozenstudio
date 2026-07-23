import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPaymentFn } from "@/lib/paystack.functions";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    reference: typeof s.reference === "string" ? s.reference : (typeof s.trxref === "string" ? s.trxref : ""),
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const { reference } = useSearch({ from: "/payment/callback" });
  const verify = useServerFn(verifyPaymentFn);
  const qc = useQueryClient();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("Verifying your payment...");
  const [redirect, setRedirect] = useState<{ to: string; label: string } | null>(null);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMsg("Missing payment reference.");
      return;
    }
    (async () => {
      try {
        const res = await verify({ data: { reference } });
        if (res.ok) {
          setState("success");
          setMsg(res.message || "Payment confirmed.");
          setRedirect(res.redirectTo ? { to: res.redirectTo, label: res.redirectLabel || "View purchase" } : null);
          qc.invalidateQueries();
        } else {
          setState("error");
          setMsg(res.message || "Payment could not be verified.");
        }
      } catch (e: any) {
        setState("error");
        setMsg(e?.message || "Verification failed");
      }
    })();
  }, [reference, verify, qc]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="glass-strong rounded-3xl p-8 text-center">
        {state === "loading" && <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />}
        {state === "success" && <CheckCircle2 className="w-12 h-12 mx-auto text-success" />}
        {state === "error" && <XCircle className="w-12 h-12 mx-auto text-destructive" />}
        <h1 className="mt-4 text-2xl font-display font-bold">
          {state === "loading" ? "Please wait" : state === "success" ? "Success" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <div className="mt-6 flex gap-2 justify-center">
          {redirect && (
            <Button asChild className="gradient-primary text-primary-foreground">
              <Link to={redirect.to as any}>{redirect.label}</Link>
            </Button>
          )}
          <Button asChild variant="outline"><Link to="/tiers">Tiers</Link></Button>
          <Button asChild className={redirect ? "" : "gradient-primary text-primary-foreground"}><Link to="/dashboard">Dashboard</Link></Button>
        </div>
        {reference && <div className="text-[11px] text-muted-foreground mt-6">Ref: {reference}</div>}
      </div>
    </div>
  );
}
