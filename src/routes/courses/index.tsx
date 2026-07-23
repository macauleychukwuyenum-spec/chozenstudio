import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { formatNGN } from "@/lib/format";
import { GraduationCap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses | Chozen Studio" },
      { name: "description", content: "Premium courses on tech, design, and business." },
    ],
  }),
  component: CoursesList,
});

function CoursesList() {
  const { data } = useQuery({
    queryKey: ["public-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center mx-auto mb-5">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Courses</h1>
          <p className="mt-3 text-muted-foreground">Learn from curated programs. Buy directly or use an eligible Chozen Tier.</p>
        </div>
        {data?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((c: any) => (
              <Link key={c.id} to="/courses/$slug" params={{ slug: c.slug }} className="glass rounded-2xl overflow-hidden hover:shadow-glow transition">
                <SignedImage bucket="course-files" path={c.cover_url} alt={c.title}
                  className="w-full aspect-[16/10] object-cover"
                  fallback={<div className="w-full aspect-[16/10] gradient-primary" />} />
                <div className="p-5">
                  <h3 className="font-display font-semibold text-lg">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Access L{c.required_access_level}</span>
                    <span className="font-semibold">{c.price_ngn ? formatNGN(c.price_ngn) : "Included"}</span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">No courses published yet.</div>
        )}
      </section>
    </PublicLayout>
  );
}
