import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/referral-policy")({
  head: () => ({
    meta: [
      { title: "Referral Program Policy — Chozen Studio" },
      { name: "description", content: "How the Chozen Studio referral program works, eligibility, and payout rules." },
      { property: "og:url", content: "/referral-policy" },
    ],
    links: [{ rel: "canonical", href: "/referral-policy" }],
  }),
  component: RefPolicy,
});

function RefPolicy() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 prose prose-invert prose-headings:font-display">
        <h1>Referral Program Policy</h1>

        <h2>1. Overview</h2>
        <p>Chozen Studio rewards members who refer paying customers. The program is a customer loyalty feature, not the platform's primary product.</p>

        <h2>2. Eligibility</h2>
        <ul>
          <li>You must have an active Chozen Studio account.</li>
          <li>Only direct referrals are rewarded (no multi-level payouts).</li>
          <li>Self-referrals and duplicate accounts are not allowed.</li>
        </ul>

        <h2>3. When a referral counts</h2>
        <p>A referral becomes valid only after the referred user signs up with your code, purchases an eligible Chozen Tier, and the payment is confirmed.</p>

        <h2>4. Commission</h2>
        <p>The commission percentage per tier is displayed on the tier page and may be adjusted by admins. Commissions are credited to your wallet after payment confirmation.</p>

        <h2>5. Withdrawals</h2>
        <p>Withdrawals require the current minimum wallet balance and minimum verified referrals. See your wallet for live values.</p>

        <h2>6. Fraud prevention</h2>
        <p>Duplicate emails or phone numbers, artificial referrals, or bypass attempts result in disqualification, forfeiture of commissions, and possible account suspension.</p>

        <h2>7. Program changes</h2>
        <p>Chozen Studio may update or end the program at any time. Existing verified balances remain payable per policy.</p>
      </article>
    </PublicLayout>
  );
}
