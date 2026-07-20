import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tiers/")({
  component: AdminTiers,
});

function AdminTiers() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data: tiers } = useQuery({
    queryKey: ["admin-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const benefitsRaw = String(f.get("benefits") ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const patch = {
      name: String(f.get("name")),
      tagline: String(f.get("tagline") ?? ""),
      description: String(f.get("description") ?? ""),
      price_ngn: Number(f.get("price_ngn")),
      reward_percentage: Number(f.get("reward_percentage")),
      max_referrals: Number(f.get("max_referrals")),
      referral_requirement: Number(f.get("referral_requirement")),
      service_discount_percentage: Number(f.get("service_discount_percentage")),
      benefits: benefitsRaw,
      active: f.get("active") === "on",
    };
    const { error } = await supabase.from("tiers").update(patch).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Tier updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-tiers"] });
    qc.invalidateQueries({ queryKey: ["tiers"] });
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {tiers?.map((t) => (
        <div key={t.id} className="glass-strong rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t.slug}</div>
              <h3 className="text-lg font-display font-bold">{t.name}</h3>
              <div className="text-sm text-muted-foreground">{t.tagline}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Row label="Price" value={formatNGN(t.price_ngn)} />
            <Row label="Reward %" value={String(t.reward_percentage)} />
            <Row label="Max refs" value={String(t.max_referrals)} />
            <Row label="Req. refs" value={String(t.referral_requirement)} />
            <Row label="Discount %" value={String(t.service_discount_percentage)} />
            <Row label="Active" value={t.active ? "Yes" : "No"} />
          </div>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <Field name="name" label="Name" defaultValue={editing.name} />
              <Field name="tagline" label="Tagline" defaultValue={editing.tagline ?? ""} />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editing.description ?? ""} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field name="price_ngn" label="Price (NGN)" type="number" defaultValue={editing.price_ngn} />
                <Field name="reward_percentage" label="Reward %" type="number" defaultValue={editing.reward_percentage} />
                <Field name="max_referrals" label="Max referrals" type="number" defaultValue={editing.max_referrals} />
                <Field name="referral_requirement" label="Req. referrals" type="number" defaultValue={editing.referral_requirement} />
                <Field name="service_discount_percentage" label="Discount %" type="number" defaultValue={editing.service_discount_percentage} />
              </div>
              <div className="space-y-2">
                <Label>Benefits (one per line)</Label>
                <Textarea name="benefits" defaultValue={(editing.benefits ?? []).join("\n")} rows={5} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={editing.active} /> Active
              </label>
              <DialogFooter>
                <Button type="submit" className="gradient-primary text-primary-foreground shadow-glow">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: any; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
