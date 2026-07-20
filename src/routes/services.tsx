import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNGN } from "@/lib/format";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const FALLBACK = [
  { title: "Website Development", body: "Custom, fast, mobile-first websites and web apps." },
  { title: "Flyer & Graphic Design", body: "Eye-catching flyers, banners, and social creatives." },
  { title: "Branding", body: "Logo systems, color, typography, and brand guides." },
  { title: "Business Consultation", body: "1:1 sessions on strategy, tech, and growth." },
];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Professional Services | Chozen Studio" },
      { name: "description", content: "Website development, flyer & graphic design, branding, and consultation." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").eq("published", true).order("created_at");
      return data ?? [];
    },
  });

  const list = (services?.length ? services : FALLBACK.map((s, i) => ({ id: `f-${i}`, title: s.title, description: s.body, base_price_ngn: null }))) as any[];

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center mx-auto mb-5">
          <Wrench className="w-6 h-6" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold">Professional Services</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Get it built by the Chozen team. Every service comes with tier-based discounts.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => (
          <div key={s.id} className="glass rounded-2xl p-6 flex flex-col">
            <h3 className="font-display font-semibold text-lg">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 flex-1">{s.description}</p>
            <div className="mt-4 flex items-center justify-between">
              {s.base_price_ngn ? (
                <div className="text-sm"><span className="text-muted-foreground">from </span><b>{formatNGN(s.base_price_ngn)}</b></div>
              ) : <span />}
              <BookServiceButton service={s} />
            </div>
          </div>
        ))}
      </section>
    </PublicLayout>
  );
}

function BookServiceButton({ service }: { service: any }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isRealService = !String(service.id).startsWith("f-");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to book a service");
      return;
    }
    if (!isRealService) {
      toast.error("This service isn't available for booking yet.");
      return;
    }
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("service_bookings").insert({
      user_id: user.id,
      service_id: service.id,
      details: String(f.get("details") || ""),
      contact_phone: String(f.get("phone") || ""),
      contact_email: String(f.get("email") || user.email || ""),
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking submitted. We'll be in touch on WhatsApp.");
    setOpen(false);
  }

  if (!user) {
    return <Button asChild size="sm" className="gradient-primary text-primary-foreground rounded-xl"><Link to="/auth">Book</Link></Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-primary-foreground rounded-xl">Book</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong">
        <DialogHeader><DialogTitle>Book: {service.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2"><Label>WhatsApp number</Label><Input name="phone" required /></div>
          <div className="space-y-2"><Label>Contact email</Label><Input name="email" type="email" defaultValue={user.email ?? ""} /></div>
          <div className="space-y-2"><Label>Project details</Label><Textarea name="details" rows={5} required placeholder="Describe your project, timeline, budget…" /></div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground shadow-glow">
              {busy ? "Submitting…" : "Submit booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
