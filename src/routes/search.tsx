import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, GraduationCap, Package, Wrench, BookOpen } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({ meta: [{ title: "Search | Chozen Studio" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const term = q.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const like = `%${term}%`;
      const [courses, products, services, blogs] = await Promise.all([
        supabase.from("courses").select("id,title,slug,description").eq("published", true).or(`title.ilike.${like},description.ilike.${like}`).limit(10),
        supabase.from("digital_products").select("id,title,slug,description").eq("published", true).or(`title.ilike.${like},description.ilike.${like}`).limit(10),
        supabase.from("services").select("id,title,description").ilike("title", like).limit(10),
        supabase.from("blog_posts").select("id,title,slug,excerpt").eq("status", "published").ilike("title", like).limit(10),
      ]);
      return {
        courses: courses.data ?? [],
        products: products.data ?? [],
        services: services.data ?? [],
        blogs: blogs.data ?? [],
      };
    },
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-center">Search</h1>
        <div className="mt-6 relative max-w-xl mx-auto">
          <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Courses, products, services, articles…" className="pl-10 h-12 rounded-xl" />
        </div>

        {term.length < 2 && (
          <div className="mt-10 text-center text-sm text-muted-foreground">Type at least 2 characters to search.</div>
        )}
        {term.length >= 2 && isFetching && (
          <div className="mt-10 text-center text-sm text-muted-foreground">Searching…</div>
        )}
        {term.length >= 2 && data && (
          <div className="mt-10 space-y-8">
            <Group title="Courses" icon={GraduationCap} items={data.courses.map((c: any) => ({ id: c.id, title: c.title, sub: c.description, href: `/courses/${c.slug}` }))} />
            <Group title="Digital Products" icon={Package} items={data.products.map((c: any) => ({ id: c.id, title: c.title, sub: c.description, href: `/products/${c.slug}` }))} />
            <Group title="Services" icon={Wrench} to="/services" items={data.services.map((c) => ({ id: c.id, title: c.title, sub: c.description }))} />
            <Group title="Blog" icon={BookOpen} items={data.blogs.map((c: any) => ({ id: c.id, title: c.title, sub: c.excerpt, href: `/blog/${c.slug}` }))} />
          </div>
        )}
      </section>
    </PublicLayout>
  );
}

function Group({ title, icon: Icon, items, to, }: { title: string; icon: any; items: { id: string; title: string; sub?: string | null; href?: string }[]; to?: string }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-primary" /><h2 className="font-display font-semibold">{title}</h2></div>
      <div className="glass-strong rounded-2xl divide-y divide-border">
        {items.map((it) => {
          const href = it.href || to || "#";
          return (
            <Link key={it.id} to={href as any} className="block p-4 hover:bg-accent/40 transition">
              <div className="font-medium text-sm">{it.title}</div>
              {it.sub && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.sub}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
