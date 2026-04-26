import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, UserPlus, Check, Search, X, Crown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { haversineMeters } from "../../lib/geo";
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
  winning_outcome?: string | null;
  settlement_method: string;
  location_mode: string | null;
  location_result_type: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  check_in_radius_meters: number | null;
  check_in_deadline: string | null;
  tracking_start: string | null;
  tracking_end: string | null;
  location_target_user_id: string | null;
  final_outcome: string | null;
  settled_at: string | null;
};

type CheckIn = {
  id: string; bet_id: string; user_id: string;
  lat: number; lng: number; distance_meters: number | null;
  checked_in_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Participant = {
  id: string; user_id: string; chosen_outcome: string | null;
  amount: number; status: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Friend = { friend_id: string; username: string; display_name: string | null };

type Resolution = {
  id: string;
  bet_id: string;
  phase: "preliminary" | "outcome" | "finalized";
  trusted_user_id: string | null;
  created_at: string;
};

type PreliminaryVote = {
  id: string;
  bet_id: string;
  voter_id: string;
  trusted_user_id: string;
};

type OutcomeVote = {
  id: string;
  bet_id: string;
  voter_id: string;
  outcome: string;
};

export function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bet, setBet] = useState<Bet | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allParticipantIds, setAllParticipantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [preliminaryVotes, setPreliminaryVotes] = useState<PreliminaryVote[]>([]);
  const [outcomeVotes, setOutcomeVotes] = useState<OutcomeVote[]>([]);
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Location check-in state
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Add people state
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedNewFriends, setSelectedNewFriends] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  async function fetchData() {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const [
      { data: betData, error: betError },
      { data: acceptedData },
      { data: allParticipantsData },
      { data: resolutionData },
      { data: preliminaryVoteData },
      { data: outcomeVoteData },
      { data: checkInData },
    ] = await Promise.all([
      supabase.from("bets_summary")
        .select(`id, title, bet_type, status, total_pot, participant_count,
          creator_id, creator_username, creator_display_name, expires_at, winning_outcome,
          settlement_method, location_mode, location_result_type, location_name,
          location_lat, location_lng, check_in_radius_meters, check_in_deadline,
          tracking_start, tracking_end, location_target_user_id, final_outcome, settled_at`)
        .eq("id", id).single(),
      supabase.from("bet_participants")
        .select("id, user_id, chosen_outcome, amount, status, profiles(username, display_name)")
        .eq("bet_id", id).eq("status", "accepted"),
      supabase.from("bet_participants")
        .select("user_id").eq("bet_id", id),
      supabase.from("bet_resolutions")
        .select("id, bet_id, phase, trusted_user_id, created_at")
        .eq("bet_id", id).maybeSingle(),
      supabase.from("bet_preliminary_votes")
        .select("id, bet_id, voter_id, trusted_user_id")
        .eq("bet_id", id),
      supabase.from("bet_outcome_votes")
        .select("id, bet_id, voter_id, outcome")
        .eq("bet_id", id),
      supabase.from("bet_location_checkins")
        .select("id, bet_id, user_id, lat, lng, distance_meters, checked_in_at, profiles(username, display_name)")
        .eq("bet_id", id).order("checked_in_at", { ascending: true }),
    ]);

    if (betError) { setError(betError.message); setLoading(false); return; }
    setBet(betData as unknown as Bet ?? null);
    setParticipants((acceptedData ?? []) as unknown as Participant[]);
    setAllParticipantIds((allParticipantsData ?? []).map((p: any) => p.user_id));
    setResolution((resolutionData ?? null) as Resolution | null);
    setPreliminaryVotes((preliminaryVoteData ?? []) as PreliminaryVote[]);
    setOutcomeVotes((outcomeVoteData ?? []) as OutcomeVote[]);
    setCheckIns((checkInData ?? []) as unknown as CheckIn[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
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

  const acceptedParticipantIds = participants.map((p) => p.user_id);
  const needsPreliminaryVote = participants.length >= 3;
  const currentPreliminaryVote = preliminaryVotes.find((v) => v.voter_id === currentUserId);
  const currentOutcomeVote = outcomeVotes.find((v) => v.voter_id === currentUserId);
  const trustedParticipant = participants.find((p) => p.user_id === resolution?.trusted_user_id);
  const outcomeOptions = Array.from(new Set(participants.map((p) => p.chosen_outcome).filter(Boolean))) as string[];
  const defaultOutcomeOptions =
    bet?.bet_type === "happens-or-not" ? ["Yes", "No"] :
    bet?.bet_type === "above-below" ? ["Above", "Below"] :
    [];
  const resolutionOutcomeOptions = outcomeOptions.length > 0 ? outcomeOptions : defaultOutcomeOptions;

  const preliminaryTallies = participants.map((participant) => ({
    participant,
    votes: preliminaryVotes.filter((vote) => vote.trusted_user_id === participant.user_id).length,
  })).sort((a, b) => b.votes - a.votes);

  const outcomeTallies = resolutionOutcomeOptions.map((outcome) => ({
    outcome,
    weight: outcomeVotes
      .filter((vote) => vote.outcome === outcome)
      .reduce((sum, vote) => sum + (vote.voter_id === resolution?.trusted_user_id ? 2 : 1), 0),
  })).sort((a, b) => b.weight - a.weight);

  async function refreshResolution() {
    await fetchData();
  }

  async function startSettlement() {
    if (!bet) return;
    setSettling(true);
    setSettlementError(null);

    const { error: resolutionError } = await supabase
      .from("bet_resolutions")
      .upsert({ bet_id: bet.id, phase: needsPreliminaryVote ? "preliminary" : "outcome" }, { onConflict: "bet_id" });

    if (resolutionError) {
      setSettlementError(resolutionError.message);
      setSettling(false);
      return;
    }

    const { error: betError } = await supabase
      .from("bets")
      .update({ status: "resolving" })
      .eq("id", bet.id);

    if (betError) {
      setSettlementError(betError.message);
      setSettling(false);
      return;
    }

    await refreshResolution();
    setSettling(false);
  }

  async function castPreliminaryVote(trustedUserId: string) {
    if (!bet || !currentUserId) return;
    setSettling(true);
    setSettlementError(null);

    const { error: voteError } = await supabase
      .from("bet_preliminary_votes")
      .upsert({
        bet_id: bet.id,
        voter_id: currentUserId,
        trusted_user_id: trustedUserId,
      }, { onConflict: "bet_id,voter_id" });

    if (voteError) {
      setSettlementError(voteError.message);
      setSettling(false);
      return;
    }

    const nextVotes = [
      ...preliminaryVotes.filter((vote) => vote.voter_id !== currentUserId),
      { id: "", bet_id: bet.id, voter_id: currentUserId, trusted_user_id: trustedUserId },
    ];

    if (nextVotes.length >= participants.length) {
      const trustedUser = participants
        .map((participant) => ({
          id: participant.user_id,
          votes: nextVotes.filter((vote) => vote.trusted_user_id === participant.user_id).length,
        }))
        .sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id))[0]?.id;

      const { error: phaseError } = await supabase
        .from("bet_resolutions")
        .update({ phase: "outcome", trusted_user_id: trustedUser })
        .eq("bet_id", bet.id);

      if (phaseError) {
        setSettlementError(phaseError.message);
        setSettling(false);
        return;
      }
    }

    await refreshResolution();
    setSettling(false);
  }

  async function castOutcomeVote(outcome: string) {
    if (!bet || !currentUserId) return;
    setSettling(true);
    setSettlementError(null);

    const { error: voteError } = await supabase
      .from("bet_outcome_votes")
      .upsert({
        bet_id: bet.id,
        voter_id: currentUserId,
        outcome,
      }, { onConflict: "bet_id,voter_id" });

    if (voteError) {
      setSettlementError(voteError.message);
      setSettling(false);
      return;
    }

    const nextVotes = [
      ...outcomeVotes.filter((vote) => vote.voter_id !== currentUserId),
      { id: "", bet_id: bet.id, voter_id: currentUserId, outcome },
    ];

    if (nextVotes.length >= participants.length) {
      const winningOutcome = resolutionOutcomeOptions
        .map((option) => ({
          outcome: option,
          weight: nextVotes
            .filter((vote) => vote.outcome === option)
            .reduce((sum, vote) => sum + (vote.voter_id === resolution?.trusted_user_id ? 2 : 1), 0),
        }))
        .sort((a, b) => b.weight - a.weight || a.outcome.localeCompare(b.outcome))[0]?.outcome;

      if (winningOutcome) {
        const { error: finalizeError } = await supabase.rpc("finalize_bet_resolution", {
          bet_id_param: bet.id,
          winning_outcome_param: winningOutcome,
        });

        if (finalizeError) {
          setSettlementError(finalizeError.message);
          setSettling(false);
          return;
        }
      }
    }

    await refreshResolution();
    setSettling(false);
  }

  async function handleCheckIn() {
    if (!bet || !currentUserId) return;
    setCheckingIn(true);
    setCheckInError(null);

    if (!navigator.geolocation) {
      setCheckInError("Geolocation is not supported by this browser.");
      setCheckingIn(false);
      return;
    }

    const now = new Date();
    if (bet.location_mode === 'count') {
      if (bet.tracking_start && now < new Date(bet.tracking_start)) {
        setCheckInError("Tracking window has not started yet.");
        setCheckingIn(false);
        return;
      }
      if (bet.tracking_end && now > new Date(bet.tracking_end)) {
        setCheckInError("Tracking window has ended.");
        setCheckingIn(false);
        return;
      }
    }

    const myCheckIns = checkIns.filter((c) => c.user_id === currentUserId);
    if (bet.location_mode !== 'count' && myCheckIns.length > 0) {
      setCheckInError("You have already checked in for this bet.");
      setCheckingIn(false);
      return;
    }
    if (bet.location_mode === 'count' && myCheckIns.length > 0) {
      const lastCheckIn = new Date(myCheckIns[myCheckIns.length - 1].checked_in_at);
      if (lastCheckIn > new Date(now.getTime() - 60 * 60 * 1000)) {
        setCheckInError("You can only check in once per hour for count bets.");
        setCheckingIn(false);
        return;
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = haversineMeters(latitude, longitude, bet.location_lat!, bet.location_lng!);
        const radius = bet.check_in_radius_meters ?? 100;

        if (distance > radius) {
          setCheckInError(`You are ${Math.round(distance)}m away. Must be within ${radius}m.`);
          setCheckingIn(false);
          return;
        }

        const { error } = await supabase.from("bet_location_checkins").insert({
          bet_id: bet.id,
          user_id: currentUserId,
          lat: latitude,
          lng: longitude,
          distance_meters: distance,
        });

        if (error) {
          setCheckInError(error.message);
        } else {
          await fetchData();
        }
        setCheckingIn(false);
      },
      (err) => {
        setCheckInError(`Location error: ${err.message}`);
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handleFinalizeLocation() {
    if (!bet || !currentUserId) return;
    setFinalizing(true);
    setFinalizeError(null);

    const mode     = bet.location_mode;
    const result   = bet.location_result_type;
    const target   = bet.location_target_user_id;
    const deadline = bet.check_in_deadline ? new Date(bet.check_in_deadline) : null;
    const winStart = bet.tracking_start ? new Date(bet.tracking_start) : null;
    const winEnd   = bet.tracking_end   ? new Date(bet.tracking_end)   : null;

    let finalOutcome: string | null = null;

    if (mode === 'arrival') {
      const name = (c: CheckIn) => c.profiles?.display_name ?? c.profiles?.username ?? c.user_id;
      if (result === 'first_to_arrive') {
        finalOutcome = checkIns[0] ? name(checkIns[0]) : 'No one checked in';
      } else if (result === 'last_to_arrive') {
        finalOutcome = checkIns.length > 0 ? name(checkIns[checkIns.length - 1]) : 'No one checked in';
      } else if (result === 'late_by_deadline') {
        if (!deadline) { setFinalizeError("No deadline set."); setFinalizing(false); return; }
        const onTime = new Set(checkIns.filter((c) => new Date(c.checked_in_at) <= deadline).map((c) => c.user_id));
        const late = participants.filter((p) => !onTime.has(p.user_id));
        finalOutcome = late.length === 0
          ? 'Everyone arrived on time'
          : `Late: ${late.map((p) => p.profiles?.display_name ?? p.profiles?.username ?? p.user_id).join(', ')}`;
      }
    } else if (mode === 'presence') {
      if (!target) { setFinalizeError("No target user set."); setFinalizing(false); return; }
      const targetCheckIns = checkIns.filter((c) => c.user_id === target);
      if (result === 'target_checked_in') {
        finalOutcome = targetCheckIns.length > 0 ? 'Yes — target checked in' : 'No — target did not check in';
      } else {
        const beforeDeadline = deadline ? targetCheckIns.some((c) => new Date(c.checked_in_at) <= deadline) : false;
        finalOutcome = beforeDeadline ? 'Yes — checked in before deadline' : 'No — missed deadline';
      }
    } else if (mode === 'count') {
      if (!target) { setFinalizeError("No target user set."); setFinalizing(false); return; }
      const inWindow = checkIns.filter((c) => {
        if (c.user_id !== target) return false;
        const t = new Date(c.checked_in_at);
        if (winStart && t < winStart) return false;
        if (winEnd   && t > winEnd)   return false;
        return true;
      });
      finalOutcome = `${inWindow.length} visit(s) in tracking window`;
    }

    if (!finalOutcome) {
      setFinalizeError("Could not compute a result. Check mode and result type settings.");
      setFinalizing(false);
      return;
    }

    const { error } = await supabase.from("bets").update({
      status: "settled",
      final_outcome: finalOutcome,
      settled_at: new Date().toISOString(),
    }).eq("id", bet.id);

    if (error) {
      setFinalizeError(error.message);
    } else {
      await fetchData();
    }
    setFinalizing(false);
  }

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

        {/* Location settlement section */}
        {bet.settlement_method === 'location' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest">LOCATION SETTLEMENT</p>
            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Place</span>
                  <span className="text-foreground font-medium">{bet.location_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="text-foreground font-medium capitalize">{bet.location_mode}</span>
                </div>
                {bet.location_result_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Result type</span>
                    <span className="text-foreground font-medium">{bet.location_result_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Radius</span>
                  <span className="text-foreground font-medium">{bet.check_in_radius_meters ?? 100}m</span>
                </div>
                {bet.check_in_deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="text-foreground font-medium">{new Date(bet.check_in_deadline).toLocaleString()}</span>
                  </div>
                )}
                {bet.tracking_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking window</span>
                    <span className="text-foreground font-medium text-right">
                      {new Date(bet.tracking_start).toLocaleString()} – {bet.tracking_end ? new Date(bet.tracking_end).toLocaleString() : '?'}
                    </span>
                  </div>
                )}
                {bet.final_outcome && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Result</span>
                    <span className="text-emerald-400 font-semibold">{bet.final_outcome}</span>
                  </div>
                )}
              </div>

              {bet.status !== 'settled' && acceptedParticipantIds.includes(currentUserId ?? '') && (
                <div className="space-y-2">
                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                  >
                    {checkingIn ? "Getting location..." : "Check In Here"}
                  </button>
                  {checkInError && <p className="text-destructive text-xs">{checkInError}</p>}
                </div>
              )}

              {checkIns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Check-ins</p>
                  {checkIns.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground font-medium">
                          {c.profiles?.display_name ?? c.profiles?.username ?? 'Unknown'}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(c.checked_in_at).toLocaleString()}
                          {c.distance_meters != null && ` · ${Math.round(c.distance_meters)}m away`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isCreator && bet.status !== 'settled' && (
                <div className="space-y-2">
                  <button
                    onClick={handleFinalizeLocation}
                    disabled={finalizing}
                    className="w-full py-3 rounded-2xl border border-primary text-primary text-sm font-semibold disabled:opacity-40"
                  >
                    {finalizing ? "Computing result..." : "Finalize Location Result"}
                  </button>
                  {finalizeError && <p className="text-destructive text-xs">{finalizeError}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting settlement section */}
        {bet.settlement_method !== 'location' && (resolution || bet.status === "resolving" || bet.status === "settled") && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest">SETTLEMENT VOTE</p>
            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              {bet.status === "settled" ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Result</p>
                    <p className="text-foreground text-lg font-semibold">
                      {bet.winning_outcome ?? "Tie - all wagers refunded"}
                    </p>
                  </div>
                  <Check size={20} className="text-emerald-500" />
                </div>
              ) : !acceptedParticipantIds.includes(currentUserId ?? "") ? (
                <p className="text-muted-foreground text-sm">Accepted participants are voting to settle this bet.</p>
              ) : resolution?.phase === "preliminary" ? (
                <>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Who do you trust most to judge this?</p>
                    <p className="text-muted-foreground text-xs mt-1">The trusted participant's outcome vote counts double.</p>
                  </div>
                  <div className="space-y-2">
                    {participants.map((participant) => {
                      const profile = participant.profiles;
                      const selected = currentPreliminaryVote?.trusted_user_id === participant.user_id;
                      return (
                        <button
                          key={participant.user_id}
                          onClick={() => castPreliminaryVote(participant.user_id)}
                          disabled={settling}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                            selected ? "bg-primary/10 border-primary/50" : "bg-background border-border hover:border-primary/30"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIndex(participant.user_id)]} flex items-center justify-center text-white text-xs font-semibold`}>
                            {getInitials(profile?.display_name ?? null, profile?.username ?? "")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm font-medium">{profile?.display_name ?? profile?.username ?? "Unknown"}</p>
                            <p className="text-muted-foreground text-xs">
                              {preliminaryTallies.find((tally) => tally.participant.user_id === participant.user_id)?.votes ?? 0} trust vote(s)
                            </p>
                          </div>
                          {selected && <Check size={16} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">{preliminaryVotes.length} of {participants.length} preliminary votes in</p>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Vote on the actual outcome</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {trustedParticipant
                        ? `${trustedParticipant.profiles?.display_name ?? trustedParticipant.profiles?.username ?? "Trusted voter"} has a double-weight vote.`
                        : "Each participant gets one vote."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {resolutionOutcomeOptions.map((outcome) => {
                      const selected = currentOutcomeVote?.outcome === outcome;
                      const tally = outcomeTallies.find((item) => item.outcome === outcome);
                      return (
                        <button
                          key={outcome}
                          onClick={() => castOutcomeVote(outcome)}
                          disabled={settling}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            selected ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{outcome}</span>
                            {selected && <Check size={15} />}
                          </div>
                          <p className={`text-xs mt-1 ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                            {tally?.weight ?? 0} weighted vote(s)
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {trustedParticipant && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Crown size={14} />
                      Trusted vote: {trustedParticipant.profiles?.display_name ?? trustedParticipant.profiles?.username ?? "Unknown"}
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">{outcomeVotes.length} of {participants.length} outcome votes in</p>
                </>
              )}
              {settlementError && <p className="text-destructive text-xs">{settlementError}</p>}
            </div>
          </div>
        )}

        {bet.settlement_method !== 'location' && isCreator && bet.status !== "settled" && bet.status !== "cancelled" && (
          <button
            onClick={startSettlement}
            disabled={settling || bet.status === "resolving" || participants.length === 0}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            {bet.status === "resolving" ? "Settlement Vote Open" : settling ? "Opening Vote..." : "Settle Bet"}
          </button>
        )}

      </div>
      <BottomNav active="bets" />
    </div>
  );
}
