import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  Sparkles, GraduationCap, Package, Wrench, Shield, Users,
  Zap, Download, ArrowRight, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  { icon: Sparkles, title: "Lifetime Tier Access", body: "One-time payment, forever access to premium tier benefits." },
  { icon: GraduationCap, title: "Premium Courses", body: "Structured learning paths taught by working professionals." },
  { icon: Wrench, title: "Professional Services", body: "Web, branding, flyers, consultation — done for you." },
  { icon: Shield, title: "Secure Payments", body: "Trusted Paystack processing with encrypted checkout." },
  { icon: Users, title: "Referral Rewards", body: "Recommend Chozen Studio and earn on every tier purchase." },
  { icon: Zap, title: "Expert Support", body: "Priority help from the Chozen team when you need it." },
  { icon: Package, title: "Modern Platform", body: "Fast, responsive, mobile-first — from day one." },
  { icon: Download, title: "Instant Downloads", body: "Digital products delivered the moment you unlock them." },
];

const steps = [
  { n: 1, title: "Create your account", body: "Sign up in seconds with email or Google." },
  { n: 2, title: "Purchase a Chozen Tier", body: "Pick the tier that matches your ambition." },
  { n: 3, title: "Unlock premium content", body: "Access courses, products, and services instantly." },
  { n: 4, title: "Invite others", body: "Share your unique referral link." },
  { n: 5, title: "Earn commissions", body: "Get rewarded when your invites purchase a tier." },
  { n: 6, title: "Withdraw earnings", body: "Cash out once your goal is met." },
];

function HomePage() {
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 md:px-6 pt-16 md:pt-24 pb-20 md:pb-32">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Now welcoming Chozen members
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05]">
                If You Can Imagine It,{" "}
                <span className="text-gradient">We Can Build It.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Join Chozen Studio to unlock premium learning resources, digital products,
                professional technology services, and referral rewards through our exclusive
                Chozen Tiers.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow rounded-xl">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get Started <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl glass">
                  <Link to="/tiers">Explore Chozen Tiers</Link>
                </Button>
              </div>
              <div className="flex gap-6 pt-6 text-sm text-muted-foreground">
                <div><span className="text-2xl font-display font-bold text-foreground">4</span><br />Lifetime Tiers</div>
                <div><span className="text-2xl font-display font-bold text-foreground">∞</span><br />Access</div>
                <div><span className="text-2xl font-display font-bold text-foreground">20%</span><br />Max Rewards</div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 gradient-primary opacity-30 blur-3xl rounded-full" />
              <div className="relative glass-strong rounded-3xl p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Your Chozen Wallet</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">Active</span>
                </div>
                <div className="text-4xl font-display font-bold">₦127,500</div>
                <div className="text-xs text-muted-foreground">Lifetime earnings</div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {[
                    { label: "Referrals", value: "12" },
                    { label: "Tier", value: "Pro" },
                    { label: "Discount", value: "20%" },
                    { label: "Support", value: "Priority" },
                  ].map((s) => (
                    <div key={s.label} className="glass rounded-xl p-3">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="font-semibold">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="glass-strong rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            Built for creators, builders, and businesses.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Chozen Studio helps individuals and businesses grow through tech education,
            premium digital products, website development, flyer and graphic design,
            business consultation, and referral rewards for customers who recommend us.
          </p>
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Why choose Chozen Studio</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to learn, build, and earn — in one place.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5 hover:shadow-glow transition group">
              <div className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground grid place-items-center mb-4 group-hover:scale-110 transition">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">How it works</h2>
          <p className="mt-3 text-muted-foreground">Six steps from sign-up to withdrawal.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <div className="w-9 h-9 rounded-lg gradient-navy text-navy-foreground grid place-items-center font-display font-bold mb-3">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="relative rounded-3xl overflow-hidden gradient-navy text-navy-foreground p-10 md:p-16 text-center">
          <div className="absolute inset-0 opacity-30 gradient-primary blur-2xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-display font-bold">Ready to be Chozen?</h2>
            <p className="mt-4 text-navy-foreground/80 max-w-xl mx-auto">
              Join a community of creators and earn as you grow. Start with any tier.
            </p>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              <Button asChild size="lg" className="bg-white text-navy hover:bg-white/90 rounded-xl">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your account <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl border-white/30 text-white hover:bg-white/10">
                <Link to="/tiers">See Chozen Tiers</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-navy-foreground/80">
              {["Lifetime access", "Secure Paystack checkout", "Referral rewards"].map((x) => (
                <span key={x} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary-glow" /> {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
