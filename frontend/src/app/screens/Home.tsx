import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BottomNav } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../lib/supabase";

interface Profile {
  first_name: string | null;
  username: string;
  balance: number;
}

interface ActiveBet {
  id: string;
  title: string;
  status: string;
  total_pot: number;
  participant_count: number;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  amount: number | null;
  bets: { title: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary",
  pending: "bg-muted",
  resolving: "bg-chart-4",
  settled: "bg-success",
  cancelled: "bg-destructive",
};

function formatCurrency(n: number) {
  return "$" + n.toFixed(0);
}

function formatActivity(item: ActivityItem): {
  text: string;
  color: string;
  amount: string | null;
} {
  const title = item.bets?.title ?? "a bet";
  const amt = item.amount != null ? formatCurrency(item.amount) : null;
  switch (item.activity_type) {
    case "bet_won":
      return { text: `You won on ${title}`, color: "text-success", amount: amt };
    case "bet_lost":
      return { text: `You lost on ${title}`, color: "text-destructive", amount: amt };
    case "bet_joined":
      return { text: `You joined ${title}`, color: "text-primary", amount: amt };
    case "bet_created":
      return { text: `You created ${title}`, color: "text-primary", amount: null };
    default:
      return { text: `Activity on ${title}`, color: "text-muted-foreground", amount: amt };
  }
}

export function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const [profileRes, betsRes, activityRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, username, balance")
          .eq("id", user!.id)
          .single(),
        supabase
          .from("bets_summary")
          .select("id, title, status, total_pot, participant_count")
          .in("status", ["pending", "active", "resolving"])
          .order("created_at", { ascending: false }),
        supabase
          .from("activity_feed")
          .select("id, activity_type, amount, bets(title)")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setProfile(profileRes.data ?? null);
      setActiveBets((betsRes.data as ActiveBet[]) ?? []);
      setActivity((activityRes.data as ActivityItem[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground">
            Hey, {profile?.first_name ?? profile?.username ?? "..."} 👋
          </h2>
          <div className="px-4 py-2 rounded-full bg-card border border-border flex items-center gap-2">
            <span className="text-primary">💰</span>
            <span className="text-foreground">
              {profile ? formatCurrency(profile.balance) : "..."}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Your Active Bets</h3>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="min-w-[280px] h-[148px] bg-card rounded-3xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : activeBets.length === 0 ? (
            <div className="bg-card rounded-3xl p-5 border border-border text-muted-foreground">
              No active bets yet
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {activeBets.map((bet) => (
                <Link key={bet.id} to={`/bet/${bet.id}`}>
                  <div className="min-w-[280px] bg-card rounded-3xl p-5 border border-border space-y-3 hover:border-primary/50 transition-colors">
                    <h4 className="text-foreground line-clamp-2 min-h-[3rem]">
                      {bet.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: bet.participant_count }).map((_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs"
                        >
                          👤
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary">
                        {formatCurrency(bet.total_pot)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${STATUS_COLORS[bet.status] ?? "bg-muted"} bg-opacity-20`}
                      >
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[60px] bg-card rounded-2xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="bg-card rounded-2xl p-4 border border-border text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => {
                const { text, color, amount } = formatActivity(item);
                return (
                  <div
                    key={item.id}
                    className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className={`text-foreground ${color}`}>{text}</p>
                    </div>
                    {amount && <span className={color}>{amount}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Link
        to="/create-bet"
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10"
      >
        <button className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/50 flex items-center justify-center hover:scale-110 transition-transform">
          <span className="text-3xl">+</span>
        </button>
      </Link>

      <BottomNav active="home" />
    </div>
  );
}
