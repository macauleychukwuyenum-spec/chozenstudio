import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/forbidden")({
  head: () => ({
    meta: [
      { title: "Forbidden — Chozen Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-10 max-w-md text-center">
        <h1 className="text-5xl font-display font-bold text-gradient">403</h1>
        <h2 className="mt-3 text-xl font-semibold">Access denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page.</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-glow">Go home</Link>
      </div>
    </div>
  ),
});
