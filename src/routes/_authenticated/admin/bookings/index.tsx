import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/bookings/")({
  component: AdminBookings,
});

function AdminBookings() {
  const { data } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("*, services(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="glass-strong rounded-2xl p-6">
      <h2 className="font-display font-bold mb-4">Service bookings</h2>
      {data?.length ? (
        <div className="divide-y divide-border">
          {data.map((b: any) => (
            <div key={b.id} className="py-3 text-sm">
              <div className="font-medium">{b.services?.title ?? "Service"}</div>
              <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · {b.status}</div>
              {b.details && <div className="mt-1">{b.details}</div>}
            </div>
          ))}
        </div>
      ) : <div className="py-10 text-center text-muted-foreground text-sm">No bookings yet.</div>}
    </div>
  );
}
