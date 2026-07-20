import { createFileRoute, Link, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Mail } from "lucide-react";
import { SITE_ORIGIN } from "@/lib/referral";

const search = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
  ref: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Chozen Studio" },
      { name: "description", content: "Sign in or create your Chozen Studio account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { mode = "signin", ref, next } = useSearch({ from: "/auth" });
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeReferral, setAgreeReferral] = useState(false);

  useEffect(() => {
    if (user) nav({ to: (next as any) || "/dashboard", replace: true });
  }, [user, nav, next]);

  async function handleGoogle() {
    if (mode === "signup" && (!agreeTerms || !agreePrivacy || !agreeReferral)) {
      toast.error("Please accept all required policies before signing up with Google.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message || "Google sign-in failed");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") ?? "");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!agreeTerms || !agreePrivacy || !agreeReferral) {
          throw new Error("Please accept all required policies to continue.");
        }
        const full_name = String(form.get("full_name") ?? "");
        const phone = String(form.get("phone") ?? "");
        const now = new Date().toISOString();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: SITE_ORIGIN,
            data: {
              full_name,
              phone,
              referral_code: ref ? ref.toUpperCase() : undefined,
              agreed_terms_at: now,
              agreed_privacy_at: now,
              agreed_referral_policy_at: now,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to verify.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_ORIGIN}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Reset link sent.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back";
  const subtitle = mode === "signup"
    ? "Join Chozen Studio in seconds."
    : mode === "reset"
      ? "We'll email you a reset link."
      : "Sign in to your Chozen dashboard.";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto max-w-7xl w-full px-4 md:px-6 py-6 flex items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back home
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="glass-strong rounded-2xl p-8">
            <h1 className="text-2xl font-display font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

            {mode !== "reset" && (
              <>
                <Button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  variant="outline"
                  className="w-full mt-6 rounded-xl h-11"
                >
                  <GoogleIcon /> Continue with Google
                </Button>
                <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
                  <div className="h-px bg-border flex-1" /> or <div className="h-px bg-border flex-1" />
                </div>
              </>
            )}

            {resetSent ? (
              <div className="mt-4 glass rounded-xl p-4 text-sm flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-primary" />
                <div>Check your email for the password reset link.</div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input id="full_name" name="full_name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                {mode !== "reset" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <Link to="/auth" search={{ mode: "reset" }} className="text-xs text-primary hover:underline">
                          Forgot?
                        </Link>
                      )}
                    </div>
                    <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  </div>
                )}
                {mode === "signup" && ref && (
                  <div className="text-xs text-muted-foreground">
                    Referral code applied: <b className="text-foreground">{ref.toUpperCase()}</b>
                  </div>
                )}
                {mode === "signup" && (
                  <div className="space-y-2.5 rounded-xl glass p-3 text-sm">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 accent-primary" />
                      <span>I have read and agree to the <Link to="/terms" target="_blank" className="text-primary underline">Terms &amp; Conditions</Link>.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1 accent-primary" />
                      <span>I agree to the <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required checked={agreeReferral} onChange={(e) => setAgreeReferral(e.target.checked)} className="mt-1 accent-primary" />
                      <span>I understand the <Link to="/referral-policy" target="_blank" className="text-primary underline">Referral Rewards Policy</Link>.</span>
                    </label>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading || (mode === "signup" && (!agreeTerms || !agreePrivacy || !agreeReferral))}
                  className="w-full h-11 rounded-xl gradient-primary text-primary-foreground shadow-glow"
                >
                  {loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
                </Button>
              </form>
            )}

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signup" ? (
                <>Already have an account?{" "}
                  <Link to="/auth" search={{ mode: "signin" }} className="text-primary hover:underline">Sign in</Link>
                </>
              ) : mode === "reset" ? (
                <Link to="/auth" search={{ mode: "signin" }} className="text-primary hover:underline">Back to sign in</Link>
              ) : (
                <>New to Chozen?{" "}
                  <Link to="/auth" search={{ mode: "signup" }} className="text-primary hover:underline">Create an account</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.973 6.973 0 015 12c0-.73.13-1.43.36-2.09V7.07H2.18A11.007 11.007 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 1.7 14.97.75 12 .75 7.7.75 3.99 3.22 2.18 7.07l3.66 2.84C6.71 6.93 9.14 5 12 5z" />
    </svg>
  );
}
