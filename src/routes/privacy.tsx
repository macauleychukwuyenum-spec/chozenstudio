import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Chozen Studio" },
      { name: "description", content: "How Chozen Studio collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — Chozen Studio" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 prose prose-invert prose-headings:font-display">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">This page is maintained by Chozen Studio.</p>

        <h2>1. Information we collect</h2>
        <p>We collect the information you provide when you register, purchase a tier, book a service, or contact us — including name, email, phone, and payment references from our payment processor.</p>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To provide access to your Chozen Tier, courses, and digital products.</li>
          <li>To process payments and referral commissions.</li>
          <li>To send transactional notifications and important account updates.</li>
          <li>To improve our services and prevent fraud.</li>
        </ul>

        <h2>3. Sharing</h2>
        <p>We do not sell your personal data. We share limited data only with service providers required to run the platform (payment processor, hosting, email).</p>

        <h2>4. Data retention</h2>
        <p>We retain account data for as long as your account is active. You may request deletion by contacting support.</p>

        <h2>5. Security</h2>
        <p>We follow industry best practices for authentication, encryption in transit, and access controls. No system is 100% secure.</p>

        <h2>6. Your rights</h2>
        <p>You may access, correct, or delete your personal information. Contact us to make a request.</p>

        <h2>7. Changes</h2>
        <p>We may update this policy from time to time. Material changes will be communicated in-app.</p>

        <h2>8. Contact</h2>
        <p>For privacy questions, use the Contact page.</p>
      </article>
    </PublicLayout>
  );
}
