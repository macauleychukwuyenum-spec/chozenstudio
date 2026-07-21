import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <span className="grid place-items-center w-9 h-9 rounded-xl shadow-glow group-hover:scale-105 transition overflow-hidden">
        <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9" />
      </span>
      {!compact && (
        <span className="font-display font-bold text-lg tracking-tight">
          Chozen<span className="text-gradient">Studio</span>
        </span>
      )}
    </Link>
  );
}
