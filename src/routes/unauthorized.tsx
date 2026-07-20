import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Unauthorized — Chozen Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-10 max-w-md text-center">
        <h1 className="text-5xl font-display font-bold text-gradient">401</h1>
        <h2 className="mt-3 text-xl font-semibold">You need to sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page requires an account.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/auth" className="rounded-xl gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-glow">Sign in</Link>
          <Link to="/" className="rounded-xl border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent">Home</Link>
        </div>
      </div>
    </div>
  ),
});
