import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { Wallet } from "lucide-react";
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
  user_id: string;
  bets: { title: string } | null;
}

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

function formatActivity(
  item: ActivityItem,
  myUserId: string,
  myUsername: string,
  usernameMap: Record<string, string>
): { username: string; verb: string; bet: string; amount: string | null } {
  const title = item.bets?.title ?? "a bet";
  const username = item.user_id === myUserId
    ? myUsername
    : (usernameMap[item.user_id] ?? "Someone");
  const amt = item.amount != null ? formatCurrency(item.amount) : null;
  switch (item.activity_type) {
    case "bet_won":
      return { username, verb: "Won", bet: title, amount: amt ? `+${amt}` : null };
    case "bet_lost":
      return { username, verb: "Lost", bet: title, amount: amt ? `-${amt}` : null };
    case "bet_joined":
      return { username, verb: "Joined", bet: title, amount: amt };
    case "bet_created":
      return { username, verb: "Created", bet: title, amount: null };
    default:
      return { username, verb: "Activity on", bet: title, amount: amt };
  }
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [displayNameMap, setDisplayNameMap] = useState<Record<string, string | null>>({});
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data: myBets } = await supabase
        .from("bet_participants")
        .select("bet_id")
        .eq("user_id", user?.id ?? "");

      const myBetIds = (myBets ?? []).map((b) => b.bet_id);

      const [profileRes, betsRes, activityRes, invitesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, username, balance")
          .eq("id", user?.id ?? "")
          .single(),
        supabase
          .from("bets_summary")
          .select("id, title, status, total_pot, participant_count")
          .in("id", myBetIds.length > 0 ? myBetIds : [""])
          .in("status", ["pending", "active", "resolving"])
          .order("created_at", { ascending: false }),
        supabase
          .from("activity_feed")
          .select("id, activity_type, amount, user_id, bets(title)")
          .in("bet_id", myBetIds.length > 0 ? myBetIds : [""])
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("bet_participants")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user?.id ?? "")
          .eq("status", "invited"),
      ]);

      const activityData = (activityRes.data ?? []) as unknown as ActivityItem[];

      const userIds = [...new Set(activityData.map((a) => a.user_id))];
      const profilesRes = await supabase
        .from("profiles")
        .select("id, username, first_name")
        .in("id", userIds.length > 0 ? userIds : [""]);

      const map: Record<string, string> = {};
      const dnMap: Record<string, string | null> = {};
      (profilesRes.data ?? []).forEach((p: { id: string; username: string; first_name: string | null }) => {
        map[p.id] = p.first_name ?? p.username;
        dnMap[p.id] = p.first_name;
      });

      setProfile(profileRes.data ?? null);
      setActiveBets((betsRes.data ?? []) as ActiveBet[]);
      setActivity(activityData);
      setUsernameMap(map);
      setDisplayNameMap(dnMap);
      setInviteCount(invitesRes.count ?? 0);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="relative flex-1 min-h-0">
        <div className="overflow-y-auto scrollbar-hide h-full px-6 pt-8 pb-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground">
              Hey, {profile?.first_name ?? profile?.username ?? "..."}!
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/friends", { state: { openInbox: true } })}
                className="relative w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground"
              >
                <Bell size={16} />
                {inviteCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {inviteCount}
                  </span>
                )}
              </button>
              <div className="px-4 py-2 rounded-full bg-card border border-border flex items-center gap-2">
                <Wallet size={18} className="text-primary" strokeWidth={2.5} />
                <span className="text-foreground">
                  {profile ? formatCurrency(profile.balance) : "..."}
                </span>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[#F9FAFB] font-heading">Balance History</h3>
              {balancePct !== null && (
                <span className={`text-small ${balancePct >= 0 ? "text-success" : "text-destructive"}`}>
                  {balancePct >= 0 ? "+" : ""}{balancePct}%
                </span>
              )}
            </div>
            <div className="w-full h-[180px] min-h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={balanceData} margin={{ top: 15, right: 10, bottom: 5, left: -20 }}>
                  <XAxis
                    dataKey="date"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tick={{ fill: "currentColor" }}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "12px" }}
                    key="xaxis"
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tick={{ fill: "currentColor" }}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `$${value}`}
                    key="yaxis"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                    itemStyle={{ color: "var(--primary)" }}
                    formatter={(value: number) => [`$${value}`, "Balance"]}
                    key="tooltip"
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ fill: "var(--primary)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    key="line-amount"
                  />
                </LineChart>
              </ResponsiveContainer>
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
                        <span className="text-foreground">
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
                  const { username, verb, bet, amount } = formatActivity(
                    item,
                    user?.id ?? "",
                    profile?.first_name ?? profile?.username ?? "You",
                    usernameMap
                  );
                  const dn = item.user_id === user?.id
                    ? null
                    : (displayNameMap[item.user_id] ?? null);
                  const un = item.user_id === user?.id
                    ? (profile?.username ?? "")
                    : (usernameMap[item.user_id] ?? "");
                  const initials = getInitials(dn, un);
                  const avatarColor = AVATAR_COLORS[colorIndex(item.user_id)];
                  return (
                    <div
                      key={item.id}
                      className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-sm font-semibold">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium">{username}</p>
                        <p className="text-muted-foreground text-sm">
                          <span className="font-bold text-foreground">{verb}</span> {bet}
                        </p>
                      </div>
                      {amount && (
                        <span className="text-foreground font-medium">{amount}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}