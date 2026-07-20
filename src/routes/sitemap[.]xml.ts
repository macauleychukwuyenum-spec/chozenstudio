import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://chozenstudio.online";

interface SitemapEntry { path: string; lastmod?: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly" },
          { path: "/tiers", changefreq: "weekly", priority: "0.9" },
          { path: "/courses", changefreq: "weekly" },
          { path: "/products", changefreq: "weekly" },
          { path: "/services", changefreq: "weekly" },
          { path: "/blog", changefreq: "daily" },
          { path: "/contact", changefreq: "monthly" },
          { path: "/privacy", changefreq: "yearly" },
          { path: "/terms", changefreq: "yearly" },
          { path: "/referral-policy", changefreq: "yearly" },
          { path: "/cookies", changefreq: "yearly" },
        ];

        // Dynamic: published blog posts
        try {
          const { data } = await supabase.from("blog_posts").select("slug, updated_at").eq("status", "published");
          (data ?? []).forEach((p: any) => entries.push({
            path: `/blog/${p.slug}`,
            lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
          }));
        } catch {}

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) => [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n")),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
