import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDraggableFab } from "@/hooks/use-draggable-fab";

export function WhatsAppButton() {
  const [num, setNum] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("Hello Chozen Studio, I would like to make an enquiry.");
  const { style, dragHandlers, consumeDragClick, dragging } = useDraggableFab({
    storageKey: "chozen-whatsapp-position",
    size: 52,
    fallback: () => ({
      x: window.innerWidth - 68,
      y: window.innerHeight - (window.innerWidth < 768 ? 188 : 132),
    }),
  });

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "whatsapp_number").maybeSingle()
      .then(({ data }) => setNum((data?.value as any)?.v ?? null));
    supabase.from("app_settings").select("value").eq("key", "whatsapp_message").maybeSingle()
      .then(({ data }) => { const v = (data?.value as any)?.v; if (v) setMsg(v); });
  }, []);

  const digits = (num || "2348000000000").replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className={`group fixed z-50 rounded-full grid place-items-center shadow-xl transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ ...style, background: "#25D366" }}
      draggable={false}
      onClick={(event) => {
        if (consumeDragClick()) event.preventDefault();
      }}
      {...dragHandlers}
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="white" aria-hidden="true">
        <path d="M19.11 17.29c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.13-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.13-1.14-.42-2.16-1.34-.8-.72-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.47-.83-2.01-.22-.53-.44-.46-.61-.47l-.52-.01c-.18 0-.47.07-.72.34s-.95.93-.95 2.27.98 2.63 1.11 2.81c.13.18 1.92 2.93 4.65 4.11.65.28 1.16.44 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.31z"/>
        <path d="M27.24 4.76A15.86 15.86 0 0 0 16 .13C7.24.13.13 7.24.13 16c0 2.8.73 5.55 2.13 7.96L0 32l8.24-2.16A15.87 15.87 0 0 0 16 31.87c8.76 0 15.87-7.11 15.87-15.87 0-4.24-1.65-8.22-4.63-11.24zM16 29.2c-2.42 0-4.79-.65-6.86-1.88l-.49-.29-4.89 1.28 1.3-4.77-.32-.5A13.16 13.16 0 0 1 2.8 16C2.8 8.72 8.72 2.8 16 2.8s13.2 5.92 13.2 13.2S23.28 29.2 16 29.2z"/>
      </svg>
      <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg glass-strong px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition">
        Chat on WhatsApp
      </span>
    </a>
  );
}
