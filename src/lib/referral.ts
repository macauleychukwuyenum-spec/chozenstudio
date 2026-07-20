export const SITE_ORIGIN = "https://chozenstudio.online";

export function referralLink(code: string | null | undefined) {
  if (!code) return "";
  return `${SITE_ORIGIN}/auth?mode=signup&ref=${encodeURIComponent(code)}`;
}
