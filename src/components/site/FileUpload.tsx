import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  bucket: "avatars" | "blog-images" | "course-files" | "product-files";
  /** Folder inside the bucket (e.g. user id). Required for `avatars`. */
  folder?: string;
  /** Current stored path (bucket-relative) or full URL. */
  value?: string | null;
  onChange: (path: string | null) => void;
  accept?: string;
  maxMB?: number;
  label?: string;
  preview?: boolean;
};

/** Returns a browser-usable URL for a bucket-relative path (signed for private buckets). */
export async function resolveStorageUrl(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export function FileUpload({ bucket, folder, value, onChange, accept = "image/*", maxMB = 10, label = "Upload file", preview = true }: Props) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const needsOwnerFolder = bucket === "avatars" || bucket === "blog-images";
  const canUpload = !needsOwnerFolder || !!folder;

  async function refreshPreview(path: string | null) {
    if (!path || !preview) return setPreviewUrl(null);
    setPreviewUrl(await resolveStorageUrl(bucket, path));
  }

  useEffect(() => { void refreshPreview(value ?? null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value, bucket]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!canUpload) return toast.error("Please wait for your account to finish loading, then try again.");
    if (f.size > maxMB * 1024 * 1024) return toast.error(`Max ${maxMB}MB`);
    setBusy(true);
    try {
      const ext = f.name.split(".").pop() || "bin";
      const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, f, { upsert: true, contentType: f.type });
      if (error) throw error;
      onChange(path);
      await refreshPreview(path);
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" variant="outline" size="sm" disabled={busy || !canUpload} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          {label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(null); setPreviewUrl(null); }}>
            <X className="w-3 h-3 mr-1" /> Remove
          </Button>
        )}
        {value && <span className="text-xs text-muted-foreground truncate max-w-[240px]">{value}</span>}
      </div>
      {preview && previewUrl && accept.includes("image") && (
        <img src={previewUrl} alt="Preview" className="rounded-lg max-h-40 border border-border" />
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={onFile} className="hidden" />
    </div>
  );
}
