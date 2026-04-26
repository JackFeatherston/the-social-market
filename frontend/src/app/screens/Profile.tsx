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

  const [newUsername, setNewUsername] = useState("");
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function handleChangeUsername() {
    if (!newUsername.trim() || !profile) return;
    setSavingUsername(true);
    setUsernameMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", profile.id);
    if (error) {
      const msg = error.message.toLowerCase();
      setUsernameError(true);
      if (msg.includes("unique") || msg.includes("duplicate") || error.code === "23505") {
        setUsernameMsg("Username already taken. Please choose another.");
      } else {
        setUsernameMsg("Something went wrong. Please try again.");
      }
    } else {
      setUsernameError(false);
      setProfile({ ...profile, username: newUsername.trim() });
      setNewUsername("");
      setUsernameMsg("Username updated.");
    }
    setSavingUsername(false);
  }

  async function handleChangePassword() {
    if (!newPassword) return;
    setSavingPassword(true);
    setPasswordMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message.toLowerCase();
      setPasswordError(true);
      if (msg.includes("least") || msg.includes("characters") || msg.includes("short")) {
        setPasswordMsg("Password must be at least 6 characters.");
      } else {
        setPasswordMsg("Something went wrong. Please try again.");
      }
    } else {
      setPasswordError(false);
      setNewPassword("");
      setPasswordMsg("Password updated.");
    }
    setSavingPassword(false);
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
      <div className="relative h-full flex flex-col bg-background items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  const color = profile ? AVATAR_COLORS[colorIndex(profile.id)] : "bg-muted";
  const initials = profile ? getInitials(profile.display_name, profile.username) : "??";

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-6 pt-8 space-y-4">

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

        {/* Change username */}
        <div className="pt-4 space-y-2">
          <p className="text-foreground text-sm font-semibold">Change Username</p>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={profile?.username ?? "New username"}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleChangeUsername}
            disabled={savingUsername || !newUsername.trim()}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingUsername ? "Saving…" : "Save Username"}
          </button>
          {usernameMsg && (
            <p className={`text-xs ${usernameError ? "text-destructive" : "text-emerald-500"}`}>
              {usernameMsg}
            </p>
          )}
        </div>

        {/* Change password */}
        <div className="pt-2 space-y-2">
          <p className="text-foreground text-sm font-semibold">Change Password</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingPassword ? "Saving…" : "Save Password"}
          </button>
          {passwordMsg && (
            <p className={`text-xs ${passwordError ? "text-destructive" : "text-emerald-500"}`}>
              {passwordMsg}
            </p>
          )}
        </div>

      </div>
      <BottomNav active="profile" />
    </div>
  );
}
