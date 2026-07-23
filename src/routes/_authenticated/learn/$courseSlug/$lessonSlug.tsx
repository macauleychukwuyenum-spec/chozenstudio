import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { resolveStorageUrl } from "@/components/site/FileUpload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Award, Lock } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/learn/$courseSlug/$lessonSlug")({
  component: LessonPlayer,
  notFoundComponent: () => <div className="p-16 text-center">Lesson not found.</div>,
});

function LessonPlayer() {
  const { courseSlug, lessonSlug } = Route.useParams();
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["learn", courseSlug, lessonSlug, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data: course } = await supabase.from("courses").select("*").eq("slug", courseSlug).maybeSingle();
      if (!course) throw notFound();

      // access check: admin, direct course purchase, or active tier access.
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid!);
      const isAdmin = roles?.some((r: any) => r.role === "admin");

      const [{ data: purchases }, { data: coursePurchase }] = await Promise.all([
        supabase
          .from("tier_purchases")
          .select("tier_id, cycle_status, tiers(course_access_level)")
          .eq("user_id", uid!)
          .eq("cycle_status", "active"),
        supabase
          .from("course_purchases" as any)
          .select("id")
          .eq("user_id", uid!)
          .eq("course_id", course.id)
          .maybeSingle(),
      ]);
      const maxLevel = Math.max(0, ...(purchases ?? []).map((p: any) => p.tiers?.course_access_level ?? 0));
      const hasAccess = isAdmin || Boolean(coursePurchase) || maxLevel >= course.required_access_level;

      const { data: lessons } = await supabase.from("course_lessons" as any).select("*").eq("course_id", course.id).eq("published", true).order("order_index");
      const list = (lessons as any[]) ?? [];
      const current = list.find((l) => l.slug === lessonSlug);
      if (!current) throw notFound();

      const { data: progress } = await supabase.from("lesson_progress" as any).select("lesson_id").eq("user_id", uid!).eq("course_id", course.id);
      const completedIds = new Set(((progress as any[]) ?? []).map((p) => p.lesson_id));

      const { data: certRaw } = await supabase.from("certificates" as any).select("*").eq("user_id", uid!).eq("course_id", course.id).maybeSingle();
      const cert = certRaw as any;

      return { course, lessons: list, current, completedIds, hasAccess, cert };
    },
  });

  useEffect(() => {
    if (!data) return;
    resolveStorageUrl("course-files", data.current.video_url).then(setVideoUrl);
    resolveStorageUrl("course-files", data.current.attachment_url).then(setAttachmentUrl);
  }, [data]);

  if (!data) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;
  const { course, lessons, current, completedIds, hasAccess, cert } = data;

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="glass-strong rounded-2xl p-10">
          <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-display font-bold">Locked</h1>
          <p className="text-muted-foreground mt-2">Buy this course or use an active tier with access level {course.required_access_level} or higher to view it.</p>
          <Link to="/dashboard/tiers"><Button className="mt-6 gradient-primary text-primary-foreground">Upgrade tier</Button></Link>
        </div>
      </div>
    );
  }

  const idx = lessons.findIndex((l: any) => l.id === current.id);
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const isCompleted = completedIds.has(current.id);
  const allDone = lessons.every((l: any) => completedIds.has(l.id) || l.id === current.id);

  async function markComplete() {
    const { error } = await supabase.from("lesson_progress" as any).insert({
      user_id: uid, lesson_id: current.id, course_id: course.id,
    });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Lesson completed");

    // If all lessons done, issue certificate
    const willBeAllDone = lessons.every((l: any) => completedIds.has(l.id) || l.id === current.id);
    if (willBeAllDone && !cert) {
      const number = `CHZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await supabase.from("certificates" as any).insert({ user_id: uid, course_id: course.id, certificate_number: number });
      toast.success("🎉 Certificate issued!");
    }
    qc.invalidateQueries({ queryKey: ["learn"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        <Link to="/courses/$slug" params={{ slug: course.slug }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {course.title}
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-bold">{current.title}</h1>

        {videoUrl ? (
          <video src={videoUrl} controls className="w-full rounded-2xl aspect-video bg-black" />
        ) : current.video_url && current.video_url.startsWith("http") ? (
          <div className="aspect-video rounded-2xl overflow-hidden">
            <iframe src={current.video_url} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : null}

        <div className="glass-strong rounded-2xl p-6 whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {current.content || <span className="text-muted-foreground">No lesson notes.</span>}
        </div>

        {attachmentUrl && (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="glass rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm hover:shadow-glow">
            📎 Download attachment
          </a>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {prev ? (
            <Link to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug: course.slug, lessonSlug: prev.slug }}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-1" /> Previous</Button>
            </Link>
          ) : <div />}
          <Button onClick={markComplete} disabled={isCompleted} className="gradient-primary text-primary-foreground">
            {isCompleted ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Completed</> : "Mark complete"}
          </Button>
          {next ? (
            <Link to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug: course.slug, lessonSlug: next.slug }}>
              <Button variant="outline">Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          ) : <div />}
        </div>

        {cert && (
          <div className="glass-strong rounded-2xl p-6 border border-primary/30">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-primary" />
              <div>
                <div className="font-display font-bold">Certificate earned</div>
                <div className="text-xs text-muted-foreground">#{cert.certificate_number}</div>
              </div>
            </div>
            <Link to="/verify/$number" params={{ number: cert.certificate_number }}>
              <Button variant="outline" size="sm" className="mt-3">View certificate</Button>
            </Link>
          </div>
        )}
      </div>

      <aside className="glass-strong rounded-2xl p-4 h-fit lg:sticky lg:top-6">
        <div className="text-xs uppercase text-muted-foreground mb-2 px-2">Lessons</div>
        <ol className="space-y-1">
          {lessons.map((l: any, i: number) => {
            const done = completedIds.has(l.id);
            const active = l.id === current.id;
            return (
              <li key={l.id}>
                <Link
                  to="/learn/$courseSlug/$lessonSlug"
                  params={{ courseSlug: course.slug, lessonSlug: l.slug }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${active ? "bg-primary/15 text-foreground" : "hover:bg-muted"}`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="truncate">{i + 1}. {l.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
