import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Award, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/verify/$number")({
  head: ({ params }) => ({ meta: [{ title: `Verify ${params.number} | Chozen Studio` }] }),
  component: VerifyCert,
  notFoundComponent: () => <PublicLayout><div className="p-16 text-center">Certificate not found.</div></PublicLayout>,
});

function VerifyCert() {
  const { number } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["cert", number],
    queryFn: async () => {
      const { data: cert } = await supabase.from("certificates" as any).select("*").eq("certificate_number", number).maybeSingle();
      if (!cert) throw notFound();
      const c: any = cert;
      const [{ data: course }, { data: profile }] = await Promise.all([
        supabase.from("courses").select("title, slug").eq("id", c.course_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", c.user_id).maybeSingle(),
      ]);
      return { cert: c, course, profile };
    },
  });

  if (!data) return <PublicLayout><div className="p-16 text-center text-muted-foreground">Loading…</div></PublicLayout>;
  const { cert, course, profile } = data;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="glass-strong rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary text-primary-foreground grid place-items-center mb-4">
              <Award className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-1 rounded-full mb-4">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </div>
            <h1 className="font-display font-bold text-2xl">Certificate of Completion</h1>
            <div className="mt-6 text-muted-foreground">Awarded to</div>
            <div className="font-display font-bold text-xl mt-1">{profile?.full_name || "Chozen Member"}</div>
            <div className="mt-4 text-muted-foreground">for successfully completing</div>
            <div className="font-display font-semibold text-lg mt-1">{course?.title}</div>
            <div className="mt-8 text-xs text-muted-foreground">
              Certificate ID: <b className="text-foreground">{cert.certificate_number}</b>
              <br />Issued: {new Date(cert.issued_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
