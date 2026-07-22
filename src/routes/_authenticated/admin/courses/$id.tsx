import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUpload } from "@/components/site/FileUpload";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/courses/$id")({
  component: LessonsAdmin,
});

const COURSE_DOCUMENT_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
].join(",");

function LessonsAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_lessons" as any).select("*").eq("course_id", id).order("order_index");
      if (error) throw error;
      return data as any[];
    },
  });

  function openCreate() { setVideoPath(null); setAttachmentPath(null); setCreating(true); }
  function openEdit(l: any) { setVideoPath(l.video_url); setAttachmentPath(l.attachment_url); setEditing(l); }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      course_id: id,
      title: String(f.get("title") ?? ""),
      slug: String(f.get("slug") ?? "").toLowerCase().replace(/\s+/g, "-"),
      content: String(f.get("content") ?? ""),
      video_url: videoPath,
      attachment_url: attachmentPath,
      order_index: Number(f.get("order_index") ?? 0),
      duration_minutes: Number(f.get("duration_minutes") ?? 0),
      published: f.get("published") === "on",
    };
    if (editing) {
      const { error } = await supabase.from("course_lessons" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logAudit({ action: "course_lessons.edit", target_type: "course_lessons", target_id: editing.id, after_data: payload });
    } else {
      const { error } = await supabase.from("course_lessons" as any).insert(payload);
      if (error) return toast.error(error.message);
      await logAudit({ action: "course_lessons.create", target_type: "course_lessons", after_data: payload });
    }
    toast.success("Saved");
    setEditing(null); setCreating(false);
    qc.invalidateQueries({ queryKey: ["admin-lessons", id] });
  }

  async function remove(l: any) {
    if (!confirm(`Delete "${l.title}"?`)) return;
    const { error } = await supabase.from("course_lessons" as any).delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: "course_lessons.delete", target_type: "course_lessons", target_id: l.id, before_data: l });
    qc.invalidateQueries({ queryKey: ["admin-lessons", id] });
  }

  const open = creating || !!editing;

  return (
    <div className="space-y-4">
      <Link to="/admin/courses" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">{course?.title ?? "Lessons"}</h2>
          <div className="text-sm text-muted-foreground">{lessons?.length ?? 0} lessons</div>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate}>
          <Plus className="w-3 h-3 mr-1" /> New lesson
        </Button>
      </div>

      <div className="space-y-2">
        {lessons?.map((l) => (
          <div key={l.id} className="glass-strong rounded-xl p-4 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <div className="w-8 text-xs text-muted-foreground text-center">{l.order_index}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{l.title}</div>
              <div className="text-xs text-muted-foreground truncate">/{l.slug} · {l.duration_minutes} min · {l.published ? "Published" : "Draft"}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => remove(l)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {lessons?.length === 0 && <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No lessons yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edit lesson` : "New lesson"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2"><Label>Title</Label><Input name="title" defaultValue={editing?.title} required /></div>
            <div className="space-y-2"><Label>Slug</Label><Input name="slug" defaultValue={editing?.slug} required /></div>
            <div className="space-y-2"><Label>Content / notes</Label><Textarea name="content" defaultValue={editing?.content ?? ""} rows={5} /></div>
            <div className="space-y-2">
              <Label>Video (upload file or paste embed URL below)</Label>
              <FileUpload bucket="course-files" value={videoPath} onChange={setVideoPath} accept="video/*" maxMB={500} label="Upload video" preview={false} />
              <Input placeholder="Or paste YouTube/Vimeo embed URL" value={videoPath?.startsWith("http") ? videoPath : ""} onChange={(e) => setVideoPath(e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Attachment (PDF or document)</Label>
              <FileUpload bucket="course-files" value={attachmentPath} onChange={setAttachmentPath} accept={COURSE_DOCUMENT_ACCEPT} maxMB={200} label="Upload PDF/document" preview={false} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Order</Label><Input name="order_index" type="number" defaultValue={editing?.order_index ?? (lessons?.length ?? 0)} /></div>
              <div className="space-y-2"><Label>Duration (min)</Label><Input name="duration_minutes" type="number" defaultValue={editing?.duration_minutes ?? 0} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={editing?.published ?? true} /> Published</label>
            <DialogFooter><Button type="submit" className="gradient-primary text-primary-foreground">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
