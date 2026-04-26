import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BottomNav } from "../components/BottomNav";

type Tab = "friends" | "requests" | "find";

const AVATAR_COLORS = [
  "bg-teal-500", "bg-rose-400", "bg-violet-500", "bg-pink-400",
  "bg-indigo-400", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${Math.max(1, h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


function Avatar({ id, displayName, username, size = "md" }: {
  id: string; displayName: string | null; username: string; size?: "sm" | "md" | "lg";
}) {
  const color = AVATAR_COLORS[colorIndex(id)];
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {getInitials(displayName, username)}
    </div>
  );
}

type FriendRow = { friendship_id: string; friend_id: string; username: string; display_name: string | null; balance: number };
type RequestRow = { id: string; created_at: string; profile: { id: string; username: string; display_name: string | null } };
type SuggestionRow = { id: string; username: string; display_name: string | null };
type LeaderboardEntry = FriendRow & { isMe: boolean };
type Invite = {
  participant_id: string;
  bet_id: string;
  amount: number;
  bet_title: string;
  bet_type: string;
  creator_id: string;
  creator_username: string;
  creator_display_name: string | null;
  threshold: number | null;
};

const RANK_LABELS = ["1", "2", "3"];

export function Friends() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; username: string; display_name: string | null; balance: number } | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [sent, setSent] = useState<RequestRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [invites, setInvites] = useState<Invite[]>([]);
  const showInbox = !!(location.state as any)?.openInbox;
  const [outcomeSelections, setOutcomeSelections] = useState<Record<string, string>>({});
  const [directionSelections, setDirectionSelections] = useState<Record<string, string>>({});
  const [howManySelections, setHowManySelections] = useState<Record<string, number>>({});
  const [wagerSelections, setWagerSelections] = useState<Record<string, string>>({});
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const defaultSuggestions = useRef<SuggestionRow[]>([]);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (activeTab !== "find") return;
    if (!searchQuery.trim()) { setSuggestions(defaultSuggestions.current); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const excludeIds = [
        me?.id,
        ...friends.map((f) => f.friend_id),
        ...incoming.map((r) => r.profile?.id),
        ...sent.map((r) => r.profile?.id),
      ].filter(Boolean) as string[];
      let query = supabase.from("profiles").select("id, username, display_name")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`).limit(10);
      if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);
      const { data } = await query;
      setSuggestions(data ?? []);
      setSearchLoading(false);
    }, 300);
    return () => { clearTimeout(timer); setSearchLoading(false); };
  }, [searchQuery, activeTab]);

  async function fetchAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [
      { data: myProfile },
      { data: friendsData },
      { data: incomingData },
      { data: sentData },
      { data: rawInvites },
    ] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, balance").eq("id", user.id).single(),
      supabase.from("friends_with_profiles").select("friendship_id, friend_id, username, display_name"),
      supabase.from("friendships")
        .select("id, created_at, profiles!friendships_requester_id_fkey(id, username, display_name)")
        .eq("addressee_id", user.id).eq("status", "pending"),
      supabase.from("friendships")
        .select("id, created_at, profiles!friendships_addressee_id_fkey(id, username, display_name)")
        .eq("requester_id", user.id).eq("status", "pending"),
      supabase.from("bet_participants").select("id, bet_id, amount")
        .eq("user_id", user.id).eq("status", "invited"),
    ]);

    const friendIds = (friendsData ?? []).map((f: any) => f.friend_id);
    const sentProfileIds = (sentData ?? []).map((r: any) => (r.profiles as any)?.id).filter(Boolean);
    const incomingIds = (incomingData ?? []).map((r: any) => (r.profiles as any)?.id).filter(Boolean);
    const excludeIds = [user.id, ...friendIds, ...incomingIds, ...sentProfileIds].filter(Boolean);

    const [{ data: balanceData }, { data: suggestionsData }] = await Promise.all([
      friendIds.length > 0
        ? supabase.from("profiles").select("id, balance").in("id", friendIds)
        : Promise.resolve({ data: [] }),
      supabase.from("profiles").select("id, username, display_name")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(10),
    ]);

    // Fetch bet details for invites
    let invitesList: Invite[] = [];
    if (rawInvites && rawInvites.length > 0) {
      const betIds = rawInvites.map((i: any) => i.bet_id);
      const [{ data: betsData }, { data: thresholdsData }] = await Promise.all([
        supabase
          .from("bets_summary")
          .select("id, title, bet_type, creator_id, creator_username, creator_display_name")
          .in("id", betIds),
        supabase
          .from("bets")
          .select("id, threshold")
          .in("id", betIds),
      ]);
      invitesList = rawInvites.map((inv: any) => {
        const bet = (betsData ?? []).find((b: any) => b.id === inv.bet_id);
        const thresholdRow = (thresholdsData ?? []).find((t: any) => t.id === inv.bet_id);
        return {
          participant_id: inv.id,
          bet_id: inv.bet_id,
          amount: inv.amount,
          bet_title: bet?.title ?? "Unknown Bet",
          bet_type: bet?.bet_type ?? "",
          creator_id: bet?.creator_id ?? "",
          creator_username: bet?.creator_username ?? "",
          creator_display_name: bet?.creator_display_name ?? null,
          threshold: thresholdRow?.threshold ?? null,
        };
      });
    }

    const balanceMap = new Map<string, number>((balanceData ?? []).map((p: any) => [p.id, p.balance]));
    setMe(myProfile ?? null);
    setFriends((friendsData ?? []).map((f: any) => ({ ...f, balance: balanceMap.get(f.friend_id) ?? 0 })));
    setIncoming((incomingData ?? []).map((r: any) => ({ id: r.id, created_at: r.created_at, profile: r.profiles })));
    setSent((sentData ?? []).map((r: any) => ({ id: r.id, created_at: r.created_at, profile: r.profiles })));
    defaultSuggestions.current = suggestionsData ?? [];
    setSuggestions(suggestionsData ?? []);
    setInvites(invitesList);
    setLoading(false);
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    setIncoming((prev) => prev.filter((r) => r.id !== friendshipId));
    fetchAll();
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setIncoming((prev) => prev.filter((r) => r.id !== friendshipId));
  }

  async function sendRequest(profileId: string) {
    if (!me) return;
    const person = suggestions.find((p) => p.id === profileId);
    setPendingAdd((s) => new Set([...s, profileId]));
    setSuggestions((prev) => prev.filter((p) => p.id !== profileId));
    const { data } = await supabase.from("friendships")
      .insert({ requester_id: me.id, addressee_id: profileId })
      .select("id, created_at").single();
    if (data && person) {
      setSent((prev) => [...prev, { id: data.id, created_at: data.created_at, profile: { id: person.id, username: person.username, display_name: person.display_name } }]);
    }
  }

  function getChosenOutcome(invite: Invite): string | null {
    const pid = invite.participant_id;
    if (invite.bet_type === "happens-or-not") return outcomeSelections[pid] || null;
    if (invite.bet_type === "above-below") {
      const dir = directionSelections[pid];
      return dir && invite.threshold != null ? `${dir} ${invite.threshold}` : null;
    }
    if (invite.bet_type === "how-many") return String(howManySelections[pid] ?? 5);
    return null;
  }

  function isPickValid(invite: Invite): boolean {
    const pid = invite.participant_id;
    if (invite.bet_type === "happens-or-not") return !!outcomeSelections[pid];
    if (invite.bet_type === "above-below") return !!directionSelections[pid];
    if (invite.bet_type === "how-many") return true;
    return false;
  }

  async function acceptInvite(invite: Invite) {
    const pid = invite.participant_id;
    const outcome = getChosenOutcome(invite);
    if (!isPickValid(invite)) return;
    const customWager = parseFloat(wagerSelections[pid] ?? "");
    const wagerAmount = !isNaN(customWager) && customWager > 0 ? customWager : invite.amount;
    setProcessingInvite(pid);
    const { error } = await supabase.from("bet_participants")
      .update({ status: "accepted", chosen_outcome: outcome, amount: wagerAmount })
      .eq("id", pid);
    if (!error) setInvites((prev) => prev.filter((i) => i.participant_id !== pid));
    setProcessingInvite(null);
  }

  async function declineInvite(participantId: string) {
    setProcessingInvite(participantId);
    const { error } = await supabase.from("bet_participants")
      .update({ status: "declined" })
      .eq("id", participantId);
    if (!error) setInvites((prev) => prev.filter((i) => i.participant_id !== participantId));
    setProcessingInvite(null);
  }

  const leaderboard: LeaderboardEntry[] = me
    ? [...friends.map((f) => ({ ...f, isMe: false })), { friendship_id: "me", friend_id: me.id, username: me.username, display_name: me.display_name, balance: me.balance, isMe: true }]
        .sort((a, b) => b.balance - a.balance).slice(0, 3)
    : [];

  const filteredSuggestions = suggestions.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.username.toLowerCase().includes(q) || (p.display_name ?? "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="relative h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
        <BottomNav active="friends" />
      </div>
    );
  }

  // Inbox panel
  if (showInbox) {
    return (
      <div className="relative h-full flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-8 pb-6 space-y-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground"
            >
              ←
            </button>
            <h1 className="text-foreground text-2xl font-bold">Bet Invites</h1>
          </div>

          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-3">
              <Bell size={32} className="text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No pending invites</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => {
                const pid = invite.participant_id;
                const processing = processingInvite === pid;
                const pickValid = isPickValid(invite);
                const customWagerVal = parseFloat(wagerSelections[pid] ?? "");
                const finalWager = !isNaN(customWagerVal) && customWagerVal > 0 ? customWagerVal : invite.amount;

                return (
                  <div key={pid} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    {/* Creator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[colorIndex(invite.creator_id)]} flex items-center justify-center text-white text-xs font-semibold`}>
                        {getInitials(invite.creator_display_name, invite.creator_username)}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {invite.creator_display_name ?? invite.creator_username} invited you
                      </p>
                    </div>

                    {/* Bet title */}
                    <p className="text-foreground font-semibold">{invite.bet_title}</p>

                    {/* happens-or-not */}
                    {invite.bet_type === "happens-or-not" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Pick your side</p>
                        <div className="flex gap-2">
                          {(["Yes", "No"] as const).map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setOutcomeSelections((prev) => ({ ...prev, [pid]: opt }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                outcomeSelections[pid] === opt
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* above-below */}
                    {invite.bet_type === "above-below" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Threshold</p>
                          <p className="text-foreground text-xl font-bold">{invite.threshold ?? "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Your pick</p>
                          <div className="flex gap-2">
                            {(["Above", "Below"] as const).map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setDirectionSelections((prev) => ({ ...prev, [pid]: opt }))}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                  directionSelections[pid] === opt
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {directionSelections[pid] && invite.threshold != null && (
                          <p className="text-primary text-sm font-semibold">→ {directionSelections[pid]} {invite.threshold}</p>
                        )}
                      </div>
                    )}

                    {/* how-many */}
                    {invite.bet_type === "how-many" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Pick your count</p>
                        <div className="text-center">
                          <span className="text-4xl font-bold text-foreground">{howManySelections[pid] ?? 5}</span>
                          <span className="text-muted-foreground text-base ml-2">times</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          value={howManySelections[pid] ?? 5}
                          onChange={(e) => setHowManySelections((prev) => ({ ...prev, [pid]: Number(e.target.value) }))}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span><span>50</span>
                        </div>
                      </div>
                    )}

                    {/* Wager */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Your wager (suggested: ${invite.amount.toFixed(0)})</p>
                      <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2">
                        <span className="text-primary font-bold">$</span>
                        <input
                          type="number"
                          value={wagerSelections[pid] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                              setWagerSelections((prev) => ({
                                ...prev,
                                [pid]: value,
                              }));
                            }
                          }}
                          placeholder={invite.amount.toFixed(0)}
                          className="flex-1 bg-transparent text-foreground text-sm font-semibold outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    {/* Accept / Decline */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => declineInvite(pid)}
                        disabled={processing}
                        className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium disabled:opacity-40"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => acceptInvite(invite)}
                        disabled={!pickValid || processing || (me !== null && finalWager > Number(me.balance))}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                      >
                        {processing ? "..." : "Accept"}
                      </button>
                    </div>
                    {me !== null && finalWager > Number(me.balance) && (
                      <p className="text-destructive text-xs text-center">
                        Not enough funds! Enter a lower wager to accept.
                      </p>
                    )}
                    {!pickValid && (me === null || finalWager <= Number(me.balance)) && (
                      <p className="text-muted-foreground text-xs text-center">
                        {invite.bet_type === "above-below"
                          ? "Pick Above or Below to continue."
                          : invite.bet_type === "happens-or-not"
                          ? "Pick Yes or No above to continue."
                          : "Complete your pick above to accept."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <BottomNav active="friends" />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-8 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-2xl font-bold">Friends</h1>
          <button
            onClick={() => setActiveTab("find")}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends or @username"
            className="w-full px-4 py-3 pl-10 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: "friends", label: "Friends" },
            { id: "requests", label: "Requests", badge: incoming.length },
            { id: "find", label: "Find people" },
          ] as { id: Tab; label: string; badge?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <div className="space-y-6 pt-1">
            {leaderboard.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-4">LEADERBOARD</p>
                <div className="space-y-4">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.friend_id} className="flex items-center gap-3">
                      <span className={`text-sm w-6 text-center tabular-nums font-bold ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {RANK_LABELS[i]}
                      </span>
                      <Avatar id={entry.friend_id} displayName={entry.display_name} username={entry.isMe ? "You" : entry.username} />
                      <span className={`flex-1 ${i === 0 ? "text-foreground font-semibold" : "text-foreground"}`}>
                        {entry.isMe ? "You" : (entry.display_name ?? entry.username)}
                      </span>
                      <span className={`text-sm tabular-nums ${i === 0 ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                        ${entry.balance.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-2">YOUR FRIENDS</p>
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No friends yet. Find people to add.</p>
              ) : (
                <div className="divide-y divide-border">
                  {friends
                    .filter((f) => {
                      const q = searchQuery.toLowerCase();
                      return !q || (f.display_name ?? "").toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
                    })
                    .map((friend) => (
                      <div key={friend.friend_id} className="py-4 flex items-center gap-3">
                        <Avatar id={friend.friend_id} displayName={friend.display_name} username={friend.username} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium leading-tight">{friend.display_name ?? friend.username}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">@{friend.username}</p>
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground">${friend.balance.toFixed(0)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6 pt-1">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">
                INCOMING {incoming.length > 0 && `(${incoming.length})`}
              </p>
              {incoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">You're all caught up.</p>
              ) : (
                <div className="space-y-4">
                  {incoming.map((req) => (
                    <div key={req.id} className="flex gap-3 py-1">
                      <Avatar id={req.profile.id} displayName={req.profile.display_name} username={req.profile.username} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium leading-tight">{req.profile.display_name ?? req.profile.username}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">@{req.profile.username} · {timeAgo(req.created_at)}</p>
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={() => acceptRequest(req.id)} className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                            Accept
                          </button>
                          <button onClick={() => declineRequest(req.id)} className="px-4 py-1.5 rounded-lg text-muted-foreground text-sm hover:text-foreground transition-colors">
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sent.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">SENT</p>
                <div className="space-y-3">
                  {sent.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 py-1">
                      <Avatar id={req.profile.id} displayName={req.profile.display_name} username={req.profile.username} />
                      <div>
                        <p className="text-foreground font-medium leading-tight">{req.profile.display_name ?? req.profile.username}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">@{req.profile.username} · pending · {timeAgo(req.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Find People Tab */}
        {activeTab === "find" && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">SUGGESTED</p>
            {searchLoading ? (
              <p className="text-muted-foreground text-sm">Searching...</p>
            ) : filteredSuggestions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No results.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredSuggestions.map((person) => (
                  <div key={person.id} className="py-4 flex items-center gap-3">
                    <Avatar id={person.id} displayName={person.display_name} username={person.username} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium leading-tight">{person.display_name ?? person.username}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">@{person.username}</p>
                    </div>
                    <button
                      onClick={() => sendRequest(person.id)}
                      disabled={pendingAdd.has(person.id)}
                      className={`text-sm font-medium transition-colors ${pendingAdd.has(person.id) ? "text-muted-foreground cursor-default" : "text-primary hover:opacity-70"}`}
                    >
                      {pendingAdd.has(person.id) ? "Sent" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <BottomNav active="friends" />
    </div>
  );
}
