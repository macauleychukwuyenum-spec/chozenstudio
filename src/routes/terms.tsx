import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Chozen Studio" },
      { name: "description", content: "The terms that govern your use of Chozen Studio." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 prose prose-invert prose-headings:font-display">
        <h1>Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">By using Chozen Studio you agree to these terms.</p>

        <h2>1. Accounts</h2>
        <p>You are responsible for keeping your account and password safe. One account per person unless approved otherwise.</p>

        <h2>2. Chozen Tiers</h2>
        <p>Chozen Tiers are lifetime memberships that unlock benefits described on the tier's page. Access is personal and non-transferable.</p>

        <h2>3. Payments</h2>
        <p>Payments are processed by our payment provider. Chozen Studio does not store card details.</p>

        <h2>4. Refunds</h2>
        <p>Digital products, courses, and lifetime memberships are non-refundable once granted, except where required by law.</p>

        <h2>5. Acceptable use</h2>
        <p>No fraud, abuse, harassment, or violation of applicable law. Sharing paid content publicly is prohibited.</p>

        <h2>6. Wallet & withdrawals</h2>
        <p>Wallet balances reflect referral commissions earned per platform rules. Withdrawals are subject to the current minimum, verification, and processing times displayed in your wallet.</p>

        <h2>7. Enforcement</h2>
        <p>We may freeze, suspend, or disable accounts that violate these terms.</p>

        <h2>8. Changes</h2>
        <p>We may update these terms; continued use of the platform constitutes acceptance.</p>
      </article>
    </PublicLayout>
  );
}
