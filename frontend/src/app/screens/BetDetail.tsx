import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, UserPlus, Check, Search, X } from "lucide-react";
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
  pending: "Pending", active: "Active", resolving: "Resolving",
  settled: "Settled", cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  resolving: "bg-amber-500/20 text-amber-400",
  settled: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-destructive/20 text-destructive",
};

type Bet = {
  id: string; title: string; bet_type: string; status: string;
  total_pot: number; participant_count: number; creator_id: string;
  creator_username: string; creator_display_name: string | null; expires_at: string | null;
};

type Participant = {
  id: string; user_id: string; chosen_outcome: string | null;
  amount: number; status: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Friend = { friend_id: string; username: string; display_name: string | null };

export function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bet, setBet] = useState<Bet | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allParticipantIds, setAllParticipantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add people state
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedNewFriends, setSelectedNewFriends] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [
        { data: betData, error: betError },
        { data: acceptedData },
        { data: allParticipantsData },
      ] = await Promise.all([
        supabase.from("bets_summary")
          .select("id, title, bet_type, status, total_pot, participant_count, creator_id, creator_username, creator_display_name, expires_at")
          .eq("id", id).single(),
        supabase.from("bet_participants")
          .select("id, user_id, chosen_outcome, amount, status, profiles(username, display_name)")
          .eq("bet_id", id).eq("status", "accepted"),
        supabase.from("bet_participants")
          .select("user_id").eq("bet_id", id),
      ]);

      if (betError) { setError(betError.message); setLoading(false); return; }
      setBet(betData ?? null);
      setParticipants((acceptedData ?? []) as unknown as Participant[]);
      setAllParticipantIds((allParticipantsData ?? []).map((p: any) => p.user_id));
      setLoading(false);
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!showAddPeople) return;
    async function loadFriends() {
      const { data } = await supabase
        .from("friends_with_profiles")
        .select("friend_id, username, display_name");
      setFriendsList((data ?? []).filter((f: any) => !allParticipantIds.includes(f.friend_id)));
    }
    loadFriends();
  }, [showAddPeople, allParticipantIds]);

  async function addPeople() {
    if (!bet || selectedNewFriends.length === 0) return;
    setAdding(true);
    const wagerAmount = participants[0]?.amount ?? 10;
    const rows = selectedNewFriends.map((friendId) => ({
      bet_id: bet.id,
      user_id: friendId,
      status: "invited",
      chosen_outcome: null,
      amount: wagerAmount,
    }));
    await supabase.from("bet_participants").insert(rows);
    setAllParticipantIds((prev) => [...prev, ...selectedNewFriends]);
    setSelectedNewFriends([]);
    setFriendSearch("");
    setShowAddPeople(false);
    setAdding(false);
  }

  const filteredFriends = friendsList.filter((f) => {
    const q = friendSearch.toLowerCase();
    return !q || f.username.toLowerCase().includes(q) || (f.display_name ?? "").toLowerCase().includes(q);
  });

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
              <p className="text-foreground text-sm font-medium">{bet.creator_display_name ?? bet.creator_username}</p>
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
                <p className="text-foreground text-sm">{new Date(bet.expires_at).toLocaleDateString()}</p>
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
                      <div className={`h-full ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest">
              PARTICIPANTS ({participants.length})
            </p>
            {isCreator && bet.status !== "settled" && bet.status !== "cancelled" && (
              <button
                onClick={() => setShowAddPeople((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary font-semibold"
              >
                <UserPlus size={13} />
                Add people
              </button>
            )}
          </div>

          {/* Add people panel */}
          {showAddPeople && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search size={14} />
                <input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                />
              </div>
              <div className="h-px bg-border" />

              {filteredFriends.length === 0 ? (
                <p className="text-muted-foreground text-sm py-1">
                  {friendsList.length === 0 ? "All your friends are already in this bet." : "No matches."}
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                  {filteredFriends.map((f) => {
                    const selected = selectedNewFriends.includes(f.friend_id);
                    return (
                      <button
                        key={f.friend_id}
                        onClick={() => setSelectedNewFriends((prev) =>
                          prev.includes(f.friend_id) ? prev.filter((x) => x !== f.friend_id) : [...prev, f.friend_id]
                        )}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors ${selected ? "bg-primary/10" : "hover:bg-white/5"}`}
                      >
                        <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[colorIndex(f.friend_id)]} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
                          {getInitials(f.display_name, f.username)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-foreground font-medium leading-tight">{f.display_name ?? f.username}</p>
                          <p className="text-xs text-muted-foreground">@{f.username}</p>
                        </div>
                        {selected && <Check size={14} className="text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedNewFriends.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedNewFriends.map((fid) => {
                    const f = friendsList.find((x) => x.friend_id === fid);
                    return (
                      <span key={fid} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium">
                        {f?.display_name ?? f?.username}
                        <button onClick={() => setSelectedNewFriends((prev) => prev.filter((x) => x !== fid))}>
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowAddPeople(false); setSelectedNewFriends([]); setFriendSearch(""); }}
                  className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addPeople}
                  disabled={selectedNewFriends.length === 0 || adding}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                >
                  {adding ? "Inviting..." : `Invite ${selectedNewFriends.length > 0 ? `(${selectedNewFriends.length})` : ""}`}
                </button>
              </div>
            </div>
          )}

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
