import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { initialsFrom } from "@/lib/format";
import { FileUpload, resolveStorageUrl } from "@/components/site/FileUpload";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      return data;
    },
  });

  const [full_name, setFn] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFn(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatarPath((profile as any).avatar_url ?? null);
    }
  }, [profile]);

  useEffect(() => {
    resolveStorageUrl("avatars", avatarPath).then(setAvatarUrl);
  }, [avatarPath]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name, phone, avatar_url: avatarPath } as any).eq("id", uid!);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-6 md:py-10 space-y-6">
      <div className="glass-strong rounded-2xl p-6 flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl gradient-primary text-primary-foreground grid place-items-center font-display font-bold text-lg">
            {initialsFrom(profile?.full_name, user?.email)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-display font-bold text-lg truncate">{profile?.full_name || "Chozen Member"}</div>
          <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
          <div className="text-xs text-muted-foreground mt-1">Referral code: <b className="text-foreground">{profile?.referral_code}</b></div>
        </div>
      </div>

      <form onSubmit={save} className="glass-strong rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold">Profile</h2>
        <div className="space-y-2">
          <Label>Avatar</Label>
          <FileUpload bucket="avatars" folder={uid} value={avatarPath} onChange={setAvatarPath} accept="image/*" maxMB={5} label="Upload avatar" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={full_name} onChange={(e) => setFn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving} className="rounded-xl gradient-primary text-primary-foreground shadow-glow">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display font-bold">Account</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {isAdmin && (
            <Button asChild className="rounded-xl gradient-primary text-primary-foreground shadow-glow">
              <Link to="/admin"><Shield className="w-4 h-4" /> Open admin panel</Link>
            </Button>
          )}
          <Button variant="outline" className="rounded-xl" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
