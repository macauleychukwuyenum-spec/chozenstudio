import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { resolveStorageUrl } from "./FileUpload";

type Bucket = "avatars" | "blog-images" | "course-files" | "product-files";

export function ZoomableSignedImage({
  bucket,
  path,
  alt,
  className,
  wrapperClassName,
  fallback,
}: {
  bucket: Bucket;
  path?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    resolveStorageUrl(bucket, path).then(setUrl);
  }, [bucket, path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!path) return <>{fallback ?? null}</>;
  if (!url) return <div className={`${className ?? ""} bg-muted animate-pulse`} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block overflow-hidden text-left ${wrapperClassName ?? ""}`}
        aria-label={`View ${alt} full screen`}
      >
        <img src={url} alt={alt} className={className} loading="lazy" />
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setOpen(false)}
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-h-[90vh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
