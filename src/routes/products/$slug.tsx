import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { ZoomableSignedImage } from "@/components/site/ZoomableSignedImage";
import { resolveStorageUrl } from "@/components/site/FileUpload";
import { useAuth } from "@/lib/auth-context";
import { initializeProductCheckout } from "@/lib/paystack.functions";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, Lock, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replace(/-/g, " ")} | Chozen Digital Products` }],
  }),
  component: ProductDetail,
  notFoundComponent: () => <PublicLayout><div className="p-16 text-center">Product not found.</div></PublicLayout>,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const uid = user?.id;
  const checkout = useServerFn(initializeProductCheckout);
  const qc = useQueryClient();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["product-detail", slug, uid],
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from("digital_products")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!product) throw notFound();

      const { data: allowedRows } = await supabase
        .from("digital_product_tiers" as any)
        .select("tier_id, tiers(id,name,slug,sort_order)")
        .eq("product_id", product.id);

      let owned = false;
      let isAdmin = false;
      let tierUnlocked = false;
      let activeTierName: string | null = null;

      if (uid) {
        const [{ data: roles }, { data: ownedRow }, { data: activeCycles }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("product_purchases" as any).select("id").eq("user_id", uid).eq("product_id", product.id).maybeSingle(),
          supabase
            .from("tier_purchases")
            .select("tier_id, tiers(name,digital_access_level)")
            .eq("user_id", uid)
            .eq("cycle_status", "active"),
        ]);

        owned = Boolean(ownedRow);
        isAdmin = Boolean(roles?.some((role: any) => role.role === "admin"));
        const selectedTierIds = new Set(((allowedRows as any[]) ?? []).map((row) => row.tier_id));
        const cycles = (activeCycles as any[]) ?? [];
        const selectedCycle = cycles.find((cycle) => selectedTierIds.has(cycle.tier_id));
        const fallbackCycle = selectedTierIds.size === 0
          ? cycles.find((cycle) => Number(cycle.tiers?.digital_access_level ?? 0) >= Number(product.required_access_level))
          : null;
        const cycle = selectedCycle ?? fallbackCycle;
        tierUnlocked = Boolean(cycle);
        activeTierName = cycle?.tiers?.name ?? null;
      }

      return {
        product,
        allowedTiers: ((allowedRows as any[]) ?? [])
          .map((row) => row.tiers)
          .filter(Boolean)
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
        owned,
        isAdmin,
        tierUnlocked,
        activeTierName,
      };
    },
  });

  const hasAccess = Boolean(data?.isAdmin || data?.owned || data?.tierUnlocked);
  const product = data?.product as any;
  const ext = useMemo(() => String(product?.file_url ?? "").split(".").pop()?.toLowerCase() ?? "", [product?.file_url]);
  const fileIsImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  const fileIsPdf = ext === "pdf";

  useEffect(() => {
    if (!hasAccess || !product?.file_url) {
      setFileUrl(null);
      return;
    }
    resolveStorageUrl("product-files", product.file_url).then(setFileUrl);
  }, [hasAccess, product?.file_url]);

  async function buyProduct() {
    if (!product) return;
    if (!uid) {
      toast.error("Please sign in to buy this product.");
      return;
    }
    setBusy(true);
    try {
      const result = await checkout({ data: { productId: product.id } });
      window.location.href = result.authorization_url;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start checkout");
      qc.invalidateQueries({ queryKey: ["product-detail", slug, uid] });
    } finally {
      setBusy(false);
    }
  }

  if (!data || !product) return <PublicLayout><div className="p-16 text-center text-muted-foreground">Loading...</div></PublicLayout>;

  return (
    <PublicLayout>
      <article className="mx-auto max-w-5xl px-4 md:px-6 py-12 space-y-8">
        <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All products
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <ZoomableSignedImage
            bucket="product-files"
            path={product.cover_url}
            alt={product.title}
            wrapperClassName="w-full rounded-2xl"
            className="w-full aspect-[16/11] object-cover rounded-2xl border border-border"
            fallback={<div className="w-full aspect-[16/11] gradient-primary rounded-2xl" />}
          />

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">{product.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground leading-relaxed">{product.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="glass rounded-full px-3 py-1">{product.price_ngn ? formatNGN(product.price_ngn) : "Included"}</span>
              {data.allowedTiers.length ? (
                data.allowedTiers.map((tier: any) => (
                  <span key={tier.id} className="glass rounded-full px-3 py-1">{tier.name}</span>
                ))
              ) : (
                <span className="glass rounded-full px-3 py-1">Access L{product.required_access_level}</span>
              )}
            </div>

            {hasAccess ? (
              <div className="glass-strong rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-display font-semibold">Unlocked</div>
                    <p className="text-sm text-muted-foreground">
                      {data.isAdmin ? "Admin access" : data.owned ? "Purchased directly" : `Unlocked by ${data.activeTierName ?? "your tier"}`}
                    </p>
                  </div>
                </div>
                {fileUrl && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="gradient-primary text-primary-foreground">
                      <a href={fileUrl} target="_blank" rel="noreferrer">
                        <Eye className="w-4 h-4 mr-1" /> Open
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href={fileUrl} download>
                        <Download className="w-4 h-4 mr-1" /> Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-strong rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-display font-semibold">File locked</div>
                    <p className="text-sm text-muted-foreground">Buy this product or use an allowed Chozen tier to view and download it.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {uid ? (
                    <Button onClick={buyProduct} disabled={busy} className="gradient-primary text-primary-foreground">
                      <ShoppingCart className="w-4 h-4 mr-1" /> {busy ? "Starting..." : "Buy product"}
                    </Button>
                  ) : (
                    <Button asChild className="gradient-primary text-primary-foreground">
                      <Link to="/auth" search={{ mode: "signin" }}>Sign in to buy</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link to="/tiers">View tiers</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasAccess && product.file_url && (
          <section className="glass-strong rounded-2xl p-4 md:p-6">
            <h2 className="font-display font-bold text-lg mb-4">Product file</h2>
            {fileIsImage ? (
              <ZoomableSignedImage
                bucket="product-files"
                path={product.file_url}
                alt={`${product.title} file preview`}
                wrapperClassName="w-full rounded-xl"
                className="w-full max-h-[760px] object-contain rounded-xl bg-background border border-border"
              />
            ) : fileIsPdf && fileUrl ? (
              <iframe title={product.title} src={fileUrl} className="h-[76vh] w-full rounded-xl border border-border bg-background" />
            ) : (
              <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
                This file type cannot be previewed here. Use Open or Download above.
              </div>
            )}
          </section>
        )}
      </article>
    </PublicLayout>
  );
}
