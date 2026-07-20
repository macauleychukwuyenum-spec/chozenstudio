import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Chozen Studio" },
      { name: "description", content: "Chozen Studio builds premium learning, digital products, and technology services for creators and businesses." },
      { property: "og:title", content: "About Chozen Studio" },
      { property: "og:description", content: "Premium learning, digital products, and technology services." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 md:px-8 py-16 md:py-24 space-y-6">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient">About Chozen Studio</h1>
        <p className="text-lg text-muted-foreground">
          Chozen Studio is a modern digital learning and technology services brand. We build tools, courses,
          and digital products that help creators, entrepreneurs, and businesses turn ideas into working
          products.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="font-display font-bold text-xl">Our mission</h2>
            <p className="text-sm text-muted-foreground mt-2">
              To make premium learning and technology accessible through lifetime memberships, curated content,
              and a customer-first referral rewards program.
            </p>
          </div>
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="font-display font-bold text-xl">What we offer</h2>
            <ul className="text-sm text-muted-foreground mt-2 list-disc pl-5 space-y-1">
              <li>Lifetime Chozen Tiers</li>
              <li>Premium courses and digital products</li>
              <li>Professional technology services</li>
              <li>Referral rewards and secure wallet</li>
            </ul>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
