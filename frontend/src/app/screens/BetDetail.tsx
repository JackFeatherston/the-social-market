import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BottomNav } from "../components/BottomNav";

const AVATAR_COLORS = [
  "bg-teal-500", "bg-rose-400", "bg-violet-500", "bg-pink-400",
  "bg-indigo-400", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
];

function colorIndex(id: string): number {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return hash % AVATAR_COLORS.length;
}

function getInitials(displayName: string | null, username: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  resolving: "Resolving",
  settled: "Settled",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  resolving: "bg-amber-500/20 text-amber-400",
  settled: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-destructive/20 text-destructive",
};

type Bet = {
  id: string;
  title: string;
  bet_type: string;
  status: string;
  total_pot: number;
  participant_count: number;
  creator_id: string;
  creator_username: string;
  creator_display_name: string | null;
  expires_at: string | null;
};

type Participant = {
  id: string;
  user_id: string;
  chosen_outcome: string | null;
  amount: number;
  status: string;
  profiles: { username: string; display_name: string | null } | null;
};

export function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bet, setBet] = useState<Bet | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [{ data: betData, error: betError }, { data: participantsData }] = await Promise.all([
        supabase
          .from("bets_summary")
          .select("id, title, bet_type, status, total_pot, participant_count, creator_id, creator_username, creator_display_name, expires_at")
          .eq("id", id)
          .single(),
        supabase
          .from("bet_participants")
          .select("id, user_id, chosen_outcome, amount, status, profiles(username, display_name)")
          .eq("bet_id", id)
          .eq("status", "accepted"),
      ]);

      if (betError) { setError(betError.message); setLoading(false); return; }

      setBet(betData ?? null);
      setParticipants((participantsData ?? []) as unknown as Participant[]);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const outcomeGroups = participants.reduce<Record<string, { amount: number; count: number }>>((acc, p) => {
    const key = p.chosen_outcome ?? "Unknown";
    if (!acc[key]) acc[key] = { amount: 0, count: 0 };
    acc[key].amount += p.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  const totalAccepted = Object.values(outcomeGroups).reduce((s, g) => s + g.amount, 0);

  const OUTCOME_COLORS = ["bg-primary", "bg-destructive", "bg-amber-500", "bg-emerald-500"];

  if (loading) {
    return (
      <div className="relative h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
        <BottomNav active="bets" />
      </div>
    );
  }

  if (error || !bet) {
    return (
      <div className="relative h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-destructive text-sm text-center">{error ?? "Bet not found."}</p>
        </div>
        <BottomNav active="bets" />
      </div>
    );
  }

  const isCreator = currentUserId === bet.creator_id;

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-8 pb-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-foreground flex-1 text-lg font-semibold">Bet Details</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[bet.status] ?? STATUS_COLORS.pending}`}>
            {STATUS_LABELS[bet.status] ?? bet.status}
          </span>
        </div>

        {/* Bet card */}
        <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIndex(bet.creator_id)]} flex items-center justify-center text-white text-xs font-semibold`}>
              {getInitials(bet.creator_display_name, bet.creator_username)}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created by</p>
              <p className="text-foreground text-sm font-medium">
                {bet.creator_display_name ?? bet.creator_username}
              </p>
            </div>
          </div>

          <p className="text-foreground text-base font-semibold">{bet.title}</p>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Total Pot</p>
              <p className="text-primary text-3xl font-bold">${Number(bet.total_pot).toFixed(0)}</p>
            </div>
            {bet.expires_at && (
              <div className="text-right">
                <p className="text-muted-foreground text-xs mb-0.5">Closes</p>
                <p className="text-foreground text-sm">
                  {new Date(bet.expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pot distribution */}
        {Object.keys(outcomeGroups).length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest">POT DISTRIBUTION</p>
            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              {Object.entries(outcomeGroups).map(([outcome, group], i) => {
                const pct = totalAccepted > 0 ? (group.amount / totalAccepted) * 100 : 0;
                return (
                  <div key={outcome} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">{outcome}</span>
                      <span className="text-muted-foreground">${group.amount.toFixed(0)}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest">
            PARTICIPANTS ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accepted participants yet.</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => {
                const profile = p.profiles;
                const name = profile?.display_name ?? profile?.username ?? "Unknown";
                const username = profile?.username ?? "";
                return (
                  <div key={p.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIndex(p.user_id)]} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                      {getInitials(profile?.display_name ?? null, username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium">{name}</p>
                      {p.chosen_outcome && (
                        <p className="text-muted-foreground text-xs mt-0.5">{p.chosen_outcome}</p>
                      )}
                    </div>
                    <span className="text-foreground text-sm font-semibold">${p.amount.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settle button — creator only */}
        {isCreator && bet.status !== "settled" && bet.status !== "cancelled" && (
          <button className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">
            Settle Bet
          </button>
        )}

      </div>
      <BottomNav active="bets" />
    </div>
  );
}
