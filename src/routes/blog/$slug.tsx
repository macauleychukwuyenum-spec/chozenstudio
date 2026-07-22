import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { ZoomableSignedImage } from "@/components/site/ZoomableSignedImage";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
        {data.cover_url && (
          <ZoomableSignedImage
            bucket="blog-images"
            path={data.cover_url}
            alt={data.title}
            wrapperClassName="w-full rounded-2xl mb-6"
            className="w-full aspect-[16/9] object-cover rounded-2xl"
          />
        )}
        <h1 className="text-3xl md:text-4xl font-display font-bold">{data.title}</h1>
        <div className="text-xs text-muted-foreground mt-2">{data.published_at ? new Date(data.published_at).toLocaleDateString() : ""}</div>
        <RichBlogContent content={data.content} />
      </article>
    </PublicLayout>
  );
}

function RichBlogContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="mt-6 space-y-5 text-foreground/90 leading-relaxed">
      {blocks.map((block, index) => {
        const image = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (image) {
          return (
            <ZoomableSignedImage
              key={`${block}-${index}`}
              bucket="blog-images"
              path={image[2]}
              alt={image[1] || "Blog image"}
              wrapperClassName="w-full rounded-2xl"
              className="w-full rounded-2xl border border-border object-cover"
            />
          );
        }

        return (
          <p key={`${block}-${index}`} className="whitespace-pre-wrap">
            {renderLinks(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a
        key={`${match[1]}-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-4 hover:text-primary-glow"
      >
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
