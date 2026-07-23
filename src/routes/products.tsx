import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { useAuth } from "@/lib/auth-context";
import { initializeProductCheckout } from "@/lib/paystack.functions";
import { formatNGN } from "@/lib/format";
import { calculateDiscountedPrice, tierDiscountApplies } from "@/lib/product-pricing";
import { Button } from "@/components/ui/button";
import { Eye, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Digital Products | Chozen Studio" },
      { name: "description", content: "Downloadable digital products, templates, packs, and toolkits." },
    ],
  }),
  component: ProductsList,
});

function ProductsList() {
  const { user } = useAuth();
  const uid = user?.id;
  const checkout = useServerFn(initializeProductCheckout);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["public-products", uid],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("digital_products")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!uid || !products?.length) {
        return (products ?? []).map((product: any) => ({
          ...product,
          display_price_ngn: Number(product.price_ngn ?? 0),
          discount_percentage: 0,
          discount_tier_name: null,
        }));
      }

      const [{ data: activeCycle }, { data: discountRows }] = await Promise.all([
        supabase
          .from("tier_purchases")
          .select("tier_id, tiers(name, service_discount_percentage)")
          .eq("user_id", uid)
          .eq("cycle_status", "active")
          .order("purchased_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("digital_product_tiers" as any).select("product_id,tier_id"),
      ]);

      const discountMap = new Map<string, string[]>();
      ((discountRows as any[]) ?? []).forEach((row) => {
        discountMap.set(row.product_id, [...(discountMap.get(row.product_id) ?? []), row.tier_id]);
      });

      return products.map((product: any) => {
        const discountEligible = tierDiscountApplies({
          selectedTierIds: discountMap.get(product.id) ?? [],
          activeTierId: (activeCycle as any)?.tier_id,
        });
        const discountPercentage = discountEligible
          ? Number((activeCycle as any)?.tiers?.service_discount_percentage ?? 0)
          : 0;
        return {
          ...product,
          display_price_ngn: calculateDiscountedPrice(Number(product.price_ngn), discountPercentage),
          discount_percentage: discountPercentage,
          discount_tier_name: discountEligible ? (activeCycle as any)?.tiers?.name : null,
        };
      });
    },
  });

  async function buyProduct(productId: string) {
    if (!uid) return;
    setBusyId(productId);
    try {
      const result = await checkout({ data: { productId } });
      window.location.href = result.authorization_url;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start checkout");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center mx-auto mb-5">
            <Package className="w-6 h-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Digital Products</h1>
          <p className="mt-3 text-muted-foreground">Templates, toolkits, and downloads with Chozen Tier discounts.</p>
        </div>
        {data?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((product: any) => (
              <div key={product.id} className="glass rounded-2xl overflow-hidden">
                <Link to="/products/$slug" params={{ slug: product.slug }} className="block hover:opacity-95 transition">
                  <SignedImage
                    bucket="product-files"
                    path={product.cover_url}
                    alt={product.title}
                    className="w-full aspect-[16/10] object-cover"
                    fallback={<div className="w-full aspect-[16/10] gradient-primary" />}
                  />
                </Link>
                <div className="p-5">
                  <Link to="/products/$slug" params={{ slug: product.slug }} className="hover:text-primary transition">
                    <h3 className="font-display font-semibold text-lg">{product.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{product.description}</p>
                  <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {product.discount_percentage ? `${product.discount_tier_name} discount` : "One-time purchase"}
                    </span>
                    <span className="text-right">
                      {product.discount_percentage ? (
                        <span className="block text-xs text-muted-foreground line-through">{formatNGN(product.price_ngn)}</span>
                      ) : null}
                      <span className="font-semibold">{product.display_price_ngn ? formatNGN(product.display_price_ngn) : "Free"}</span>
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/products/$slug" params={{ slug: product.slug }}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Link>
                    </Button>
                    {uid ? (
                      <Button
                        size="sm"
                        className="gradient-primary text-primary-foreground"
                        disabled={busyId === product.id}
                        onClick={() => buyProduct(product.id)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" /> {busyId === product.id ? "Starting" : "Buy"}
                      </Button>
                    ) : (
                      <Button asChild size="sm" className="gradient-primary text-primary-foreground">
                        <Link to="/auth" search={{ mode: "signin" }}>
                          <ShoppingCart className="w-4 h-4 mr-1" /> Buy
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">No products published yet.</div>
        )}
      </section>
    </PublicLayout>
  );
}
