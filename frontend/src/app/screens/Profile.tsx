import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { BottomNav } from "../components/BottomNav";

const AVATAR_COLORS = [
  "bg-teal-500",
  "bg-rose-400",
  "bg-violet-500",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
];

function getInitials(displayName: string | null, username: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

function colorIndex(id: string): number {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return hash % AVATAR_COLORS.length;
}

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
};

export function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("id", user.id)
        .single();

      setProfile(data ?? null);
      setLoading(false);
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background pb-24 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  const color = profile ? AVATAR_COLORS[colorIndex(profile.id)] : "bg-muted";
  const initials = profile ? getInitials(profile.display_name, profile.username) : "??";

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-2xl font-bold">Profile</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Profile card */}
        <div className="flex flex-col items-center pt-8 gap-4">
          <div className={`w-24 h-24 ${color} rounded-full flex items-center justify-center`}>
            <span className="text-white text-3xl font-semibold">{initials}</span>
          </div>

          <div className="text-center">
            <p className="text-foreground text-xl font-bold">
              {profile?.display_name ?? profile?.username ?? "—"}
            </p>
            <p className="text-muted-foreground text-sm mt-0.5">
              @{profile?.username ?? ""}
            </p>
          </div>
        </div>

      </div>
      <BottomNav active="profile" />
    </div>
  );
}
