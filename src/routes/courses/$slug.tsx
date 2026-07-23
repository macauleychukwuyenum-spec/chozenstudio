import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { resolveStorageUrl } from "@/components/site/FileUpload";
import { useAuth } from "@/lib/auth-context";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Download, Lock, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replace(/-/g, " ")} | Chozen Courses` }],
  }),
  component: CourseDetail,
  notFoundComponent: () => <PublicLayout><div className="p-16 text-center">Course not found.</div></PublicLayout>,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const uid = user?.id;
  const [resourceUrl, setResourceUrl] = useState<string | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ["course", slug, uid],
    queryFn: async () => {
      const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!course) throw notFound();

      const { data: lessons } = await supabase
        .from("course_lessons" as any)
        .select("*")
        .eq("course_id", course.id)
        .eq("published", true)
        .order("order_index");

      let hasAccess = false;
      if (uid) {
        const [{ data: roles }, { data: purchases }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase
            .from("tier_purchases")
            .select("tier_id, tiers(course_access_level)")
            .eq("user_id", uid)
            .eq("cycle_status", "active"),
        ]);
        const isAdmin = Boolean(roles?.some((role: any) => role.role === "admin"));
        const maxLevel = Math.max(0, ...(((purchases as any[]) ?? []).map((purchase) => Number(purchase.tiers?.course_access_level ?? 0))));
        hasAccess = isAdmin || maxLevel >= Number(course.required_access_level);
      }

      return { course, lessons: lessons ?? [], hasAccess };
    },
  });

  const course = data?.course as any;
  const courseResource = course?.resource_url as string | null | undefined;

  useEffect(() => {
    if (!data?.hasAccess || !courseResource) {
      setResourceUrl(null);
      setResourceLoading(false);
      return;
    }

    let cancelled = false;
    setResourceLoading(true);
    resolveStorageUrl("course-files", courseResource)
      .then((url) => {
        if (!cancelled) setResourceUrl(url);
      })
      .finally(() => {
        if (!cancelled) setResourceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data?.hasAccess, courseResource]);

  if (!data || !course) {
    return <PublicLayout><div className="p-16 text-center text-muted-foreground">Loading...</div></PublicLayout>;
  }

  const { lessons, hasAccess } = data;

  return (
    <PublicLayout>
      <article className="mx-auto max-w-4xl px-4 md:px-6 py-12 space-y-8">
        <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All courses
        </Link>

        <SignedImage
          bucket="course-files"
          path={course.cover_url}
          alt={course.title}
          className="w-full aspect-[16/9] object-cover rounded-2xl"
          fallback={<div className="w-full aspect-[16/9] gradient-primary rounded-2xl" />}
          priority
        />

        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{course.title}</h1>
          <p className="mt-3 text-muted-foreground">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="glass rounded-full px-3 py-1">Access L{course.required_access_level}</span>
            <span className="glass rounded-full px-3 py-1">{course.price_ngn ? formatNGN(course.price_ngn) : "Included with tier"}</span>
            <span className="glass rounded-full px-3 py-1">{lessons.length} lessons</span>
          </div>
        </div>

        {courseResource && (
          <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              {hasAccess ? <Download className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
              <div>
                <h2 className="font-display font-semibold">Course document</h2>
                <p className="text-sm text-muted-foreground">
                  {hasAccess ? "Your tier unlocks this course resource." : `Requires active course access level ${course.required_access_level}.`}
                </p>
              </div>
            </div>
            {hasAccess ? (
              resourceUrl ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="gradient-primary text-primary-foreground">
                    <a href={resourceUrl} target="_blank" rel="noreferrer">Open</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={resourceUrl} download>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{resourceLoading ? "Preparing secure file..." : "Secure file unavailable."}</div>
              )
            ) : (
              <Button asChild variant="outline">
                <Link to={uid ? "/dashboard/tiers" : "/auth"} search={uid ? undefined : ({ mode: "signin" } as any)}>
                  {uid ? "Upgrade tier" : "Sign in"}
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg mb-4">Curriculum</h2>
          {lessons.length === 0 ? (
            <div className="text-sm text-muted-foreground">Lessons coming soon.</div>
          ) : (
            <ol className="space-y-2">
              {lessons.map((lesson: any, index: number) => (
                <li key={lesson.id}>
                  <Link
                    to="/learn/$courseSlug/$lessonSlug"
                    params={{ courseSlug: course.slug, lessonSlug: lesson.slug }}
                    className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-glow transition"
                  >
                    <div className="w-8 h-8 rounded-lg gradient-primary text-primary-foreground grid place-items-center text-sm font-bold">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{lesson.title}</div>
                      {lesson.duration_minutes > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {lesson.duration_minutes} min
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
