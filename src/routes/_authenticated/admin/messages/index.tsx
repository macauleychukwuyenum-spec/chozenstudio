import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/messages/")({
  component: AdminMessages,
});

function AdminMessages() {
  const { data } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="glass-strong rounded-2xl p-6">
      <h2 className="font-display font-bold mb-4">Contact messages</h2>
      {data?.length ? (
        <div className="divide-y divide-border">
          {data.map((m) => (
            <div key={m.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{m.name} <span className="text-muted-foreground text-xs">· {m.email}</span></div>
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              {m.subject && <div className="text-sm font-semibold mt-1">{m.subject}</div>}
              <p className="text-sm mt-1 whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      ) : <div className="py-10 text-center text-muted-foreground text-sm">No messages yet.</div>}
    </div>
  );
}
