import { useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import aiOrb from "@/assets/ai-orb.png";
import { useDraggableFab } from "@/hooks/use-draggable-fab";

type Msg = { role: "bot" | "user"; text: string; cta?: { label: string; to: string }[] };

const INTENTS: { match: RegExp; reply: string; cta?: { label: string; to: string }[] }[] = [
  { match: /(tier|plan|price|cost|packag)/i,
    reply: "Chozen Tiers unlock benefits and start a referral earning cycle. Each tier has a configurable cap on rewarded referrals — when reached, renew the tier to start a new cycle. You keep all previously unlocked benefits.",
    cta: [{ label: "See tiers", to: "/tiers" }] },
  { match: /(renew|cycle|reset|limit|cap)/i,
    reply: "Once you hit your tier's referral cap, your cycle completes. Repurchase the same (or a higher) tier to start a fresh cycle. All past earnings and history are preserved.",
    cta: [{ label: "Renew", to: "/dashboard/tiers" }] },
  { match: /(refer|invite|commission|reward)/i,
    reply: "You earn referral rewards ONLY after your invitee purchases a Chozen Tier and the payment is verified. Rewards credit to your active cycle up to its configured cap.",
    cta: [{ label: "Referrals", to: "/dashboard/referrals" }] },
  { match: /(wallet|balance|earning)/i,
    reply: "Your wallet tracks referral rewards, withdrawals, and manual credits. Withdraw once you meet your tier's minimum referral requirement.",
    cta: [{ label: "Wallet", to: "/dashboard/wallet" }] },
  { match: /(withdraw|payout|cashout)/i,
    reply: "Submit a withdrawal request with your bank details. An admin reviews, approves, and pays. Statuses: pending → approved → paid.",
    cta: [{ label: "Withdraw", to: "/dashboard/wallet" }] },
  { match: /(book|service|flyer|logo|design|website|consult)/i,
    reply: "Book any professional service on the Services page — website, flyer, branding, or consultation.",
    cta: [{ label: "Services", to: "/services" }] },
  { match: /(course|learn|lesson)/i, reply: "Courses are unlocked by your Chozen Tier. Browse the catalog to see what's available.", cta: [{ label: "Courses", to: "/courses" }] },
  { match: /(product|download|template|ebook)/i, reply: "Digital products are available for download based on your tier.", cta: [{ label: "Products", to: "/products" }] },
  { match: /(blog|article|post|write)/i, reply: "Everyone can read all articles. Eligible tiers can submit posts for admin review.", cta: [{ label: "Blog", to: "/blog" }] },
  { match: /(sign ?up|register|account|create)/i, reply: "Create an account with email or Google. You'll need to accept the Terms, Privacy Policy and Referral Rewards Policy.", cta: [{ label: "Sign up", to: "/auth" }] },
  { match: /(help|support|contact)/i, reply: "Reach the team via the contact page or WhatsApp.", cta: [{ label: "Contact", to: "/contact" }] },
];

const GREETING = "Hi 👋 I'm Chozen AI. Ask me about tiers, referrals, renewals, wallets, services, courses, or bookings.";

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const { style, dragHandlers, consumeDragClick, dragging } = useDraggableFab({
    storageKey: "chozen-ai-position",
    size: 60,
    fallback: () => ({
      x: window.innerWidth - 76,
      y: window.innerHeight - (window.innerWidth < 768 ? 124 : 84),
    }),
  });

  function respond(text: string) {
    const found = INTENTS.find((i) => i.match.test(text));
    if (found) return { text: found.reply, cta: found.cta };
    return {
      text: "I can help with tiers, referrals, renewals, wallets, withdrawals, courses, products, services, bookings, and the blog. Try any of those.",
      cta: [{ label: "See tiers", to: "/tiers" }, { label: "Contact", to: "/contact" }],
    };
  }

  function send() {
    const t = input.trim();
    if (!t) return;
    const reply = respond(t);
    setMessages((m) => [...m, { role: "user", text: t }, { role: "bot", text: reply.text, cta: reply.cta }]);
    setInput("");
  }

  return (
    <>
      <button
        aria-label="Open Chozen AI Assistant"
        title="Chozen AI Assistant"
        onClick={() => {
          if (consumeDragClick()) return;
          setOpen((o) => !o);
        }}
        className={`group fixed z-50 grid place-items-center rounded-full transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={style}
        {...dragHandlers}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / .6), transparent)" }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full glass-strong shadow-glow"
          style={{ boxShadow: "0 0 24px 4px hsl(var(--primary) / .35), inset 0 0 20px hsl(var(--primary) / .15)" }}
        />
        {open ? (
          <X className="relative z-10 w-5 h-5 text-primary-foreground" />
        ) : (
          <img src={aiOrb} alt="" width={40} height={40} loading="lazy" className="relative z-10 w-10 h-10 drop-shadow" />
        )}
        <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg glass-strong px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition">
          Chozen AI Assistant
        </span>
      </button>

      {open && (
        <div className="fixed z-50 bottom-40 md:bottom-24 right-4 w-[92vw] max-w-sm glass-strong rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
          <div className="px-4 py-3 border-b border-border gradient-primary text-primary-foreground flex items-center gap-3">
            <img src={aiOrb} alt="" width={32} height={32} className="w-8 h-8 drop-shadow" />
            <div>
              <div className="font-display font-semibold">Chozen AI Assistant</div>
              <div className="text-[11px] opacity-80">Ask about tiers, referrals, or navigation</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "gradient-primary text-primary-foreground" : "glass"}`}>
                  <div>{m.text}</div>
                  {m.cta && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.cta.map((c) => (
                        <Link key={c.to} to={c.to as any} onClick={() => setOpen(false)} className="text-xs underline underline-offset-2 opacity-90 hover:opacity-100">
                          {c.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-2 border-t border-border flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about tiers, referrals…" className="h-10" aria-label="Message the assistant" />
            <Button type="submit" size="icon" className="h-10 w-10 gradient-primary text-primary-foreground" aria-label="Send"><Send className="w-4 h-4" /></Button>
          </form>
        </div>
      )}
    </>
  );
}
