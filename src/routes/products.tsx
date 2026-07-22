import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SignedImage } from "@/components/site/SignedImage";
import { formatNGN } from "@/lib/format";
import { Package } from "lucide-react";

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
  const { data } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("digital_products").select("*").eq("published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
              <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="glass rounded-2xl overflow-hidden hover:shadow-glow transition">
                <SignedImage bucket="product-files" path={p.cover_url} alt={p.title}
                  className="w-full aspect-[16/10] object-cover"
                  fallback={<div className="w-full aspect-[16/10] gradient-primary" />} />
                <div className="p-5">
                  <h3 className="font-display font-semibold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Access L{p.required_access_level}</span>
                    <span className="font-semibold">{p.price_ngn ? formatNGN(p.price_ngn) : "Included"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">No products published yet.</div>
        )}
      </section>
    </PublicLayout>
  );
}
