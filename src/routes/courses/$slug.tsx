import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { formatNGN } from "@/lib/format";
import { ArrowLeft, PlayCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replace(/-/g, " ")} | Chozen Courses` }],
  }),
  component: CourseDetail,
  notFoundComponent: () => <PublicLayout><div className="p-16 text-center">Course not found.</div></PublicLayout>,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data: course, error } = await supabase.from("courses").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (error) throw error;
      if (!course) throw notFound();
      const { data: lessons } = await supabase.from("course_lessons" as any).select("*").eq("course_id", course.id).eq("published", true).order("order_index");
      return { course, lessons: lessons ?? [] };
    },
  });

  if (!data) return <PublicLayout><div className="p-16 text-center text-muted-foreground">Loading…</div></PublicLayout>;
  const { course, lessons } = data;

  return (
    <PublicLayout>
      <article className="mx-auto max-w-4xl px-4 md:px-6 py-12 space-y-8">
        <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All courses
        </Link>
        <SignedImage bucket="course-files" path={(course as any).cover_url} alt={course.title}
          className="w-full aspect-[16/9] object-cover rounded-2xl"
          fallback={<div className="w-full aspect-[16/9] gradient-primary rounded-2xl" />} />
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{course.title}</h1>
          <p className="mt-3 text-muted-foreground">{course.description}</p>
          <div className="mt-4 flex gap-3 text-sm">
            <span className="glass rounded-full px-3 py-1">Access L{course.required_access_level}</span>
            <span className="glass rounded-full px-3 py-1">{course.price_ngn ? formatNGN(course.price_ngn) : "Included with tier"}</span>
            <span className="glass rounded-full px-3 py-1">{lessons.length} lessons</span>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg mb-4">Curriculum</h2>
          {lessons.length === 0 ? (
            <div className="text-sm text-muted-foreground">Lessons coming soon.</div>
          ) : (
            <ol className="space-y-2">
              {lessons.map((l: any, i: number) => (
                <li key={l.id}>
                  <Link
                    to="/learn/$courseSlug/$lessonSlug"
                    params={{ courseSlug: course.slug, lessonSlug: l.slug }}
                    className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-glow transition"
                  >
                    <div className="w-8 h-8 rounded-lg gradient-primary text-primary-foreground grid place-items-center text-sm font-bold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{l.title}</div>
                      {l.duration_minutes > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {l.duration_minutes} min
                        </div>
                      )}
                    </div>
                    <PlayCircle className="w-5 h-5 text-primary shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}
