import { useEffect, useState } from "react";
import { resolveStorageUrl } from "./FileUpload";

type Bucket = "avatars" | "blog-images" | "course-files" | "product-files";

export function SignedImage({
  bucket, path, alt, className, fallback,
}: {
  bucket: Bucket;
  path?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { resolveStorageUrl(bucket, path).then(setUrl); }, [bucket, path]);
  if (!path) return <>{fallback ?? null}</>;
  if (!url) return <div className={`${className ?? ""} bg-muted animate-pulse`} />;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
