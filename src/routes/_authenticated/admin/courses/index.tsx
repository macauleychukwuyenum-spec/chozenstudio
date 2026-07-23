import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNGN } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, EyeOff, Eye, ListOrdered } from "lucide-react";
import { useState } from "react";
import { FileUpload } from "@/components/site/FileUpload";

const DOCUMENT_ACCEPT = [
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

export const Route = createFileRoute("/_authenticated/admin/courses/")({
  component: AdminCourses,
});

function AdminCourses() {
  return <ContentAdmin table="courses" title="Courses" />;
}

export function ContentAdmin({ table, title }: { table: "courses" | "digital_products"; title: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [allowedTierIds, setAllowedTierIds] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: [`admin-${table}`],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (table !== "digital_products" || !data?.length) return data;

      const { data: accessRows } = await supabase
        .from("digital_product_tiers" as any)
        .select("product_id,tier_id");
      const accessMap = new Map<string, string[]>();
      ((accessRows as any[]) ?? []).forEach((row) => {
        accessMap.set(row.product_id, [...(accessMap.get(row.product_id) ?? []), row.tier_id]);
      });
      return data.map((row: any) => ({ ...row, allowed_tier_ids: accessMap.get(row.id) ?? [] }));
    },
  });
  const { data: tiers } = useQuery({
    queryKey: ["admin-product-tiers"],
    enabled: table === "digital_products",
    queryFn: async () => {
      const { data, error } = await supabase.from("tiers").select("id,name,slug,sort_order").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [courseResourcePath, setCourseResourcePath] = useState<string | null>(null);
  const coverBucket = table === "courses" ? "course-files" : "product-files";
  const fileBucket = "product-files";

  function openCreate() {
    setCoverPath(null); setFilePath(null); setCourseResourcePath(null); setAllowedTierIds([]); setCreating(true);
  }
  function openEdit(row: any) {
    setCoverPath(row.cover_url ?? null); setFilePath(row.file_url ?? null); setCourseResourcePath(row.resource_url ?? null); setAllowedTierIds(row.allowed_tier_ids ?? []); setEditing(row);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      title: String(f.get("title") ?? ""),
      slug: String(f.get("slug") ?? "").toLowerCase().replace(/\s+/g, "-"),
      description: String(f.get("description") ?? ""),
      cover_url: coverPath,
      price_ngn: Number(f.get("price_ngn") ?? 0),
      required_access_level: Number(f.get("required_access_level") ?? 1),
      published: f.get("published") === "on",
    };
    if (table === "digital_products") payload.file_url = filePath;
    if (table === "courses") payload.resource_url = courseResourcePath;

    let savedId = editing?.id;
    if (editing) {
      const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logAudit({ action: `${table}.edit`, target_type: table, target_id: editing.id, after_data: payload });
    } else {
      const { data: inserted, error } = await supabase.from(table).insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      savedId = inserted.id;
      await logAudit({ action: `${table}.create`, target_type: table, after_data: payload });
    }
    if (table === "digital_products" && savedId) {
      const { error: deleteErr } = await supabase
        .from("digital_product_tiers" as any)
        .delete()
        .eq("product_id", savedId);
      if (deleteErr) return toast.error(deleteErr.message);

      if (allowedTierIds.length) {
        const { error: accessErr } = await supabase
          .from("digital_product_tiers" as any)
          .insert(allowedTierIds.map((tierId) => ({ product_id: savedId, tier_id: tierId })));
        if (accessErr) return toast.error(accessErr.message);
      }
    }
    toast.success("Saved");
    setEditing(null); setCreating(false);
    qc.invalidateQueries({ queryKey: [`admin-${table}`] });
  }

  async function togglePublished(row: any) {
    const { error } = await supabase.from(table).update({ published: !row.published }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: `${table}.${row.published ? "unpublish" : "publish"}`, target_type: table, target_id: row.id });
    qc.invalidateQueries({ queryKey: [`admin-${table}`] });
  }

  async function remove(row: any) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: `${table}.delete`, target_type: table, target_id: row.id, before_data: row });
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: [`admin-${table}`] });
  }

  const open = creating || !!editing;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">{title}</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map((row: any) => (
          <div key={row.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs uppercase text-muted-foreground truncate">{row.slug}</div>
                <div className="font-display font-bold truncate">{row.title}</div>
                <div className="text-sm text-muted-foreground">{formatNGN(row.price_ngn)} · access L{row.required_access_level}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${row.published ? "bg-emerald-500/20 text-emerald-400" : "bg-muted"}`}>
                {row.published ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{row.description}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
              {table === "courses" && (
                <Link to="/admin/courses/$id" params={{ id: row.id }}>
                  <Button size="sm" variant="outline"><ListOrdered className="w-3 h-3 mr-1" />Lessons</Button>
                </Link>
              )}
              <Button size="sm" variant="outline" onClick={() => togglePublished(row)}>{row.published ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}{row.published ? "Unpublish" : "Publish"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(row)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.title}` : `New ${title.slice(0, -1)}`}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <Field name="title" label="Title" defaultValue={editing?.title} />
            <Field name="slug" label="Slug" defaultValue={editing?.slug} />
            <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editing?.description ?? ""} rows={3} /></div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              <FileUpload bucket={coverBucket} value={coverPath} onChange={setCoverPath} accept="image/*" maxMB={5} label="Upload cover" />
            </div>
            {table === "courses" && (
              <div className="space-y-2">
                <Label>Course document/resource</Label>
                <FileUpload bucket="course-files" value={courseResourcePath} onChange={setCourseResourcePath} accept={DOCUMENT_ACCEPT} maxMB={200} label="Upload document" preview={false} />
              </div>
            )}
            {table === "digital_products" && (
              <div className="space-y-2">
                <Label>Downloadable file</Label>
                <FileUpload bucket={fileBucket} value={filePath} onChange={setFilePath} accept="*" maxMB={200} label="Upload file" preview={false} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field name="price_ngn" label="Price (NGN)" type="number" defaultValue={editing?.price_ngn ?? 0} />
              <Field name="required_access_level" label="Access level (1-4)" type="number" defaultValue={editing?.required_access_level ?? 1} />
            </div>
            {table === "digital_products" && (
              <div className="space-y-2">
                <Label>Discount tiers</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(tiers ?? []).map((tier: any) => (
                    <label key={tier.id} className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allowedTierIds.includes(tier.id)}
                        onChange={(event) => {
                          setAllowedTierIds((current) =>
                            event.target.checked
                              ? [...current, tier.id]
                              : current.filter((id) => id !== tier.id),
                          );
                        }}
                      />
                      {tier.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={editing?.published ?? true} /> Published</label>
            <DialogFooter><Button type="submit" className="gradient-primary text-primary-foreground">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function Field({ name, label, defaultValue, type = "text" }: any) {
  return <div className="space-y-2"><Label>{label}</Label><Input name={name} type={type} defaultValue={defaultValue} /></div>;
}
