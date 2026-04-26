import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Filter, TrendingUp, Check, Hash } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BottomNav } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../lib/supabase";

interface BetSummary {
  id: string;
  title: string;
  status: string;
  total_pot: number;
  participant_count: number;
  bet_type: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  "above-below": "#ef4444",
  "happens-or-not": "#3b82f6",
  "how-many": "#22C55E",
};

const TYPE_LABELS: Record<string, string> = {
  "above-below": "Above/Below",
  "happens-or-not": "Happens or Not",
  "how-many": "How Many Times",
};

type SortOption = "recent" | "a-z" | "highest-wager";
type FilterOption = "all" | "active" | "closed";

const ACTIVE_STATUSES = new Set(["pending", "active", "resolving"]);

function formatCurrency(n: number) {
  return "$" + n.toFixed(0);
}

export function Bets() {
  const { user } = useAuth();
  const [bets, setBets] = useState<BetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  useEffect(() => {
    if (!user) return;
    async function fetchBets() {
      const { data: participations } = await supabase
        .from("bet_participants")
        .select("bet_id")
        .eq("user_id", user!.id);

      const participantBetIds = (participations ?? []).map((p) => p.bet_id);

      const { data: createdBets } = await supabase
        .from("bets_summary")
        .select("id, title, status, total_pot, participant_count, bet_type, created_at")
        .eq("creator_id", user!.id);

      let participatedBets: BetSummary[] = [];
      if (participantBetIds.length > 0) {
        const { data } = await supabase
          .from("bets_summary")
          .select("id, title, status, total_pot, participant_count, bet_type, created_at")
          .in("id", participantBetIds);
        participatedBets = (data ?? []) as BetSummary[];
      }

      const map = new Map<string, BetSummary>();
      for (const bet of [...(createdBets ?? []), ...participatedBets] as BetSummary[]) {
        map.set(bet.id, bet);
      }
      setBets(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setLoading(false);
    }
    fetchBets();
  }, [user]);

  // Pie chart data derived from fetched bets
  const typeCountMap: Record<string, number> = {};
  for (const bet of bets) {
    typeCountMap[bet.bet_type] = (typeCountMap[bet.bet_type] ?? 0) + 1;
  }
  const pieData = Object.entries(typeCountMap).map(([type, count]) => ({
    type,
    value: count,
    color: TYPE_COLORS[type] ?? "#888",
    label: TYPE_LABELS[type] ?? type,
  }));

  const sorted = [...bets].sort((a, b) => {
    if (sortBy === "a-z") return a.title.localeCompare(b.title);
    if (sortBy === "highest-wager") return b.total_pot - a.total_pot;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeBets = sorted.filter((b) => ACTIVE_STATUSES.has(b.status));
  const closedBets = sorted.filter((b) => !ACTIVE_STATUSES.has(b.status));
  const showActive = filterBy === "all" || filterBy === "active";
  const showClosed = filterBy === "all" || filterBy === "closed";

  function applyFilter(option: SortOption | "active" | "closed" | "all") {
    if (option === "active" || option === "closed" || option === "all") {
      setFilterBy(option as FilterOption);
    } else {
      setSortBy(option as SortOption);
    }
    setShowFilter(false);
  }

  function BetCard({ bet }: { bet: BetSummary }) {
    return (
      <Link to={`/bet/${bet.id}`}>
        <div className="glass rounded-2xl p-4 space-y-3 hover:bg-white/10 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-foreground line-clamp-2">{bet.title}</p>
              <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                {bet.bet_type === "above-below" && <TrendingUp size={12} />}
                {bet.bet_type === "happens-or-not" && <Check size={12} />}
                {bet.bet_type === "how-many" && <Hash size={12} />}
                <span>{TYPE_LABELS[bet.bet_type] ?? bet.bet_type}</span>
              </div>
            </div>
            <span
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs border ${
                ACTIVE_STATUSES.has(bet.status)
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-muted/20 text-muted-foreground border-muted/30"
              }`}
            >
              {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(bet.participant_count, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-[10px]"
                >
                  👤
                </div>
              ))}
              {bet.participant_count > 4 && (
                <span className="text-muted-foreground text-xs ml-1">
                  +{bet.participant_count - 4}
                </span>
              )}
            </div>
            <span className="text-foreground">{formatCurrency(bet.total_pot)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative h-full bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-6 space-y-6">
        <h2 className="text-foreground">My Bets</h2>

        {/* Pie chart summary */}
        <div className="glass-strong rounded-3xl p-6 space-y-4">
          <h3 className="text-foreground text-center mb-2">Bet Distribution</h3>
          {loading ? (
            <div className="w-full aspect-square max-w-[280px] mx-auto rounded-full bg-white/5 animate-pulse" />
          ) : bets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bets yet</p>
          ) : (
            <>
              <div className="relative w-full aspect-square max-w-[280px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl text-foreground">{bets.length}</p>
                    <p className="text-xs text-muted-foreground">Total Bets</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                {pieData.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground text-sm">{item.label}</span>
                    </div>
                    <p className="text-foreground text-sm">{item.value} bets</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between">
          <h3 className="text-foreground">All Bets</h3>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 glass rounded-xl hover:bg-white/10 transition-colors"
          >
            <Filter size={18} strokeWidth={2.5} className="text-primary" />
          </button>
        </div>

        {showFilter && (
          <div className="glass-strong rounded-2xl p-4 space-y-1 text-sm">
            <button
              onClick={() => applyFilter("a-z")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                sortBy === "a-z" ? "text-primary" : "text-foreground"
              }`}
            >
              Sort A-Z
            </button>
            <button
              onClick={() => applyFilter("recent")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                sortBy === "recent" ? "text-primary" : "text-foreground"
              }`}
            >
              Most Recent
            </button>
            <button
              onClick={() => applyFilter("highest-wager")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                sortBy === "highest-wager" ? "text-primary" : "text-foreground"
              }`}
            >
              Highest Wager
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => applyFilter("all")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                filterBy === "all" ? "text-primary" : "text-foreground"
              }`}
            >
              All Bets
            </button>
            <button
              onClick={() => applyFilter("active")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                filterBy === "active" ? "text-primary" : "text-foreground"
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => applyFilter("closed")}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${
                filterBy === "closed" ? "text-primary" : "text-foreground"
              }`}
            >
              Closed Only
            </button>
          </div>
        )}

        {/* Active bets section */}
        {showActive && (
          <div className="space-y-3">
            <h3 className="text-foreground">Active</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[100px] bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : activeBets.length === 0 ? (
              <div className="glass rounded-2xl p-4 text-muted-foreground">No active bets</div>
            ) : (
              <div className="space-y-2">
                {activeBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Closed bets section */}
        {showClosed && (
          <div className="space-y-3">
            <h3 className="text-foreground">Closed</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[100px] bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : closedBets.length === 0 ? (
              <div className="glass rounded-2xl p-4 text-muted-foreground">No closed bets</div>
            ) : (
              <div className="space-y-2">
                {closedBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="bets" />
    </div>
  );
}
