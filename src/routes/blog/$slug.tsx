import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | Chozen Studio Blog` },
    ],
  }),
  component: BlogDetail,
  errorComponent: () => <PublicLayout><div className="p-16 text-center">Could not load article.</div></PublicLayout>,
  notFoundComponent: () => <PublicLayout><div className="p-16 text-center">Article not found.</div></PublicLayout>,
});

function BlogDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <PublicLayout><div className="p-16 text-center text-muted-foreground">Loading…</div></PublicLayout>;
  if (!data) return null;

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 md:px-6 py-12">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>
        {data.cover_url && <SignedImage bucket="blog-images" path={data.cover_url} alt={data.title} className="w-full aspect-[16/9] object-cover rounded-2xl mb-6" />}
        <h1 className="text-3xl md:text-4xl font-display font-bold">{data.title}</h1>
        <div className="text-xs text-muted-foreground mt-2">{data.published_at ? new Date(data.published_at).toLocaleDateString() : ""}</div>
        <div className="prose prose-invert max-w-none mt-6 whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {data.content}
        </div>
      </article>
    </PublicLayout>
  );
}
