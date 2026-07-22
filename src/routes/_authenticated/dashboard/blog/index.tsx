import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Link2, Lock } from "lucide-react";
import { FileUpload } from "@/components/site/FileUpload";

export const Route = createFileRoute("/_authenticated/dashboard/blog/")({
  component: BlogAuthorHome,
});

function BlogAuthorHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [inlineImage, setInlineImage] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [content, setContent] = useState("");

  const { data: canPublish } = useQuery({
    queryKey: ["can-blog", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tier_purchases")
        .select("tiers(can_submit_blogs)")
        .eq("user_id", user!.id)
        .eq("cycle_status", "active");
      return (data ?? []).some((p: any) => p.tiers?.can_submit_blogs);
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["my-blogs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("*").eq("author_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 5) return toast.error("Please add a clear title.");
    if (content.trim().length < 80) return toast.error("Please add at least 80 characters of article content.");
    setBusy(true);
    const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Date.now().toString(36);
    const { error } = await supabase.from("blog_posts").insert({
      author_id: user.id,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim(),
      cover_url: cover,
      content: content.trim(),
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted for review");
    setTitle(""); setExcerpt(""); setCover(null); setInlineImage(null); setLinkLabel(""); setLinkUrl(""); setContent("");
    nav({ to: "/dashboard/blog" });
  }

  function appendToContent(snippet: string) {
    setContent((current) => `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${snippet}`);
  }

  function insertLink() {
    const label = linkLabel.trim();
    const rawUrl = linkUrl.trim();
    if (!label || !rawUrl) return toast.error("Add both link text and URL.");
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    appendToContent(`[${label}](${url})`);
    setLinkLabel("");
    setLinkUrl("");
  }

  function handleInlineImage(path: string | null) {
    setInlineImage(path);
    if (path) appendToContent(`![Blog image](${path})`);
  }

  if (canPublish === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-display font-bold text-xl">Upgrade to submit posts</h2>
          <p className="text-sm text-muted-foreground mt-1">Blog publishing is available on eligible tiers.</p>
          <Button asChild className="mt-5 gradient-primary text-primary-foreground"><Link to="/dashboard/tiers">See tiers</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Submit a blog post</h1>
        <p className="text-sm text-muted-foreground">Your post goes to admin review before it's published.</p>
      </div>
      <form onSubmit={submit} className="glass-strong rounded-2xl p-6 space-y-3">
        <Field label="Title"><Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Excerpt"><Input maxLength={180} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
        <Field label="Cover image">
          <FileUpload bucket="blog-images" folder={user?.id} value={cover} onChange={setCover} accept="image/jpeg,image/png,image/webp" maxMB={2} label="Upload cover" />
        </Field>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <Field label="Inline image">
            <FileUpload bucket="blog-images" folder={user?.id} value={inlineImage} onChange={handleInlineImage} accept="image/jpeg,image/png,image/webp" maxMB={1} label="Insert small image" preview={false} />
          </Field>
          <div className="hidden md:flex h-9 items-center text-xs text-muted-foreground">
            <ImagePlus className="w-4 h-4 mr-1" /> Adds image to content
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Field label="Hyperlink text"><Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Read more" /></Field>
          <Field label="Hyperlink URL"><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" /></Field>
          <Button type="button" variant="outline" className="rounded-xl" onClick={insertLink}>
            <Link2 className="w-4 h-4 mr-1" /> Insert link
          </Button>
        </div>
        <Field label="Content">
          <Textarea rows={12} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the article. Inserted links and images will appear here for admin review." />
        </Field>
        <Button disabled={busy} className="gradient-primary text-primary-foreground shadow-glow">
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
      </form>

      <div>
        <h2 className="font-display font-bold mb-3">My submissions</h2>
        <div className="glass-strong rounded-2xl divide-y divide-border">
          {mine?.length ? mine.map((p: any) => (
            <div key={p.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{p.status}</span>
            </div>
          )) : <div className="p-6 text-center text-sm text-muted-foreground">No submissions yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
