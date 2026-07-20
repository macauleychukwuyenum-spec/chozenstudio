import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { BookOpen, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog | Chozen Studio" },
      { name: "description", content: "Insights, tutorials, and updates from Chozen Studio." },
    ],
  }),
  component: BlogList,
});

function BlogList() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["blog-posts", q],
    queryFn: async () => {
      let query = supabase.from("blog_posts").select("id,title,slug,excerpt,cover_url,published_at")
        .eq("status", "published").order("published_at", { ascending: false }).limit(50);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center mx-auto mb-5">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Chozen Blog</h1>
          <p className="mt-3 text-muted-foreground">Stories, tutorials, and community updates.</p>
        </div>
        <div className="max-w-md mx-auto mb-8">
          <Input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl" />
        </div>
        {data?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="glass rounded-2xl overflow-hidden hover:shadow-glow transition">
                <SignedImage bucket="blog-images" path={p.cover_url} alt={p.title}
                  className="w-full aspect-[16/10] object-cover"
                  fallback={<div className="w-full aspect-[16/10] gradient-primary" />} />

                <div className="p-5">
                  <h3 className="font-display font-semibold text-lg">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                    Read <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">No articles yet — check back soon.</div>
        )}
      </section>
    </PublicLayout>
  );
}
