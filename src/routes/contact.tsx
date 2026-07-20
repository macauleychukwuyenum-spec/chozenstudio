import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Chozen Studio" },
      { name: "description", content: "Get in touch with the Chozen Studio team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: String(form.get("name")),
      email: String(form.get("email")),
      subject: String(form.get("subject") ?? ""),
      message: String(form.get("message")),
    });
    setLoading(false);
    if (error) return toast.error("Could not send. Try again.");
    toast.success("Message sent — we'll be in touch shortly.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 md:px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Contact us</h1>
          <p className="mt-3 text-muted-foreground">Tell us about your project — we'll respond within 24 hours.</p>
        </div>

        <form onSubmit={onSubmit} className="glass-strong rounded-2xl p-6 md:p-8 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={200} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required rows={5} maxLength={5000} />
          </div>
          <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground shadow-glow rounded-xl w-full sm:w-auto">
            {loading ? "Sending…" : "Send message"}
          </Button>
        </form>
      </section>
    </PublicLayout>
  );
}
