import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Chozen Studio" },
      { name: "description", content: "How Chozen Studio uses cookies and similar technologies." },
      { property: "og:url", content: "/cookies" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 prose prose-invert prose-headings:font-display">
        <h1>Cookie Policy</h1>
        <p>We use cookies and local storage to keep you signed in, remember preferences, and measure basic platform usage.</p>

        <h2>Essential</h2>
        <p>Required for authentication and secure sessions. Cannot be disabled.</p>

        <h2>Functional</h2>
        <p>Remember your preferences (e.g. UI settings).</p>

        <h2>Analytics</h2>
        <p>Aggregate, anonymised usage to help us improve the product.</p>

        <h2>Managing cookies</h2>
        <p>You can clear cookies in your browser at any time. Doing so will sign you out.</p>
      </article>
    </PublicLayout>
  );
}
