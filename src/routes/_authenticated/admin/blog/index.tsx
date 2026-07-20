import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  component: AdminBlog,
});

function AdminBlog() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function decide(post: any, decision: "approved" | "rejected" | "published") {
    const patch: any = { status: decision };
    if (decision === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("blog_posts").update(patch).eq("id", post.id);
    if (error) return toast.error(error.message);
    if (post.author_id) {
      await supabase.from("notifications").insert({
        user_id: post.author_id,
        title: decision === "published" ? "Blog published" : decision === "approved" ? "Blog approved" : "Blog rejected",
        body: `Your post "${post.title}" was ${decision}.`,
      });
    }
    toast.success(`Marked ${decision}`);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  }

  return (
    <div className="glass-strong rounded-2xl p-6">
      <h2 className="font-display font-bold mb-4">Blog moderation</h2>
      <div className="divide-y divide-border">
        {data?.length ? data.map((p: any) => (
          <div key={p.id} className="py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()} · <span className="capitalize">{p.status}</span></div>
              {p.excerpt && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</div>}
            </div>
            <div className="flex gap-2 shrink-0">
              {p.status !== "published" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => decide(p, "published")}><Check className="w-3 h-3 mr-1" /> Publish</Button>
              )}
              {p.status === "pending" && (
                <Button size="sm" variant="destructive" onClick={() => decide(p, "rejected")}><X className="w-3 h-3" /></Button>
              )}
            </div>
          </div>
        )) : <div className="py-10 text-center text-sm text-muted-foreground">No posts yet.</div>}
      </div>
    </div>
  );
}
