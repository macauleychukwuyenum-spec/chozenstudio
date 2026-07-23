import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { useAuth } from "@/lib/auth-context";
import { initializeProductCheckout } from "@/lib/paystack.functions";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Eye, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Digital Products | Chozen Studio" },
      { name: "description", content: "Downloadable digital products — templates, packs, and toolkits." },
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
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("digital_products").select("*").eq("published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
          <p className="mt-3 text-muted-foreground">Templates, toolkits and downloads — unlocked by your Chozen Tier.</p>
        </div>
        {data?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((p: any) => (
              <div key={p.id} className="glass rounded-2xl overflow-hidden">
                <Link to="/products/$slug" params={{ slug: p.slug }} className="block hover:opacity-95 transition">
                <SignedImage bucket="product-files" path={p.cover_url} alt={p.title}
                  className="w-full aspect-[16/10] object-cover"
                  fallback={<div className="w-full aspect-[16/10] gradient-primary" />} />
                </Link>
                <div className="p-5">
                  <Link to="/products/$slug" params={{ slug: p.slug }} className="hover:text-primary transition">
                    <h3 className="font-display font-semibold text-lg">{p.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Access L{p.required_access_level}</span>
                    <span className="font-semibold">{p.price_ngn ? formatNGN(p.price_ngn) : "Included"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/products/$slug" params={{ slug: p.slug }}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Link>
                    </Button>
                    {uid ? (
                      <Button size="sm" className="gradient-primary text-primary-foreground" disabled={busyId === p.id} onClick={() => buyProduct(p.id)}>
                        <ShoppingCart className="w-4 h-4 mr-1" /> {busyId === p.id ? "Starting" : "Buy"}
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
