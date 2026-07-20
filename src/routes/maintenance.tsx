import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Chozen Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Maint,
});

function Maint() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "maintenance_message").maybeSingle()
      .then(({ data }) => setMsg((data?.value as any)?.v ?? null));
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-10 max-w-md text-center">
        <Wrench className="w-10 h-10 mx-auto text-primary" />
        <h1 className="mt-3 text-2xl font-display font-bold">We'll be right back</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg || "Chozen Studio is undergoing scheduled maintenance. Please check back shortly."}</p>
      </div>
    </div>
  );
}
