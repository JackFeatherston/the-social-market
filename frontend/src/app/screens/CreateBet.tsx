import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, TrendingUp, Check, Hash, Search, Calendar } from "lucide-react";
import { supabase } from "../../lib/supabase";

type BetType = "above-below" | "happens-or-not" | "how-many" | null;

type Friend = {
  friend_id: string;
  username: string;
  display_name: string | null;
};

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

const BET_TYPES: { id: BetType; label: string; description: string }[] = [
  { id: "above-below", label: "Above / Below", description: "Bet whether a value exceeds or falls under a threshold" },
  { id: "happens-or-not", label: "Happens or Not", description: "Binary yes/no outcome bet" },
  { id: "how-many", label: "How Many Times", description: "Bet on a count or frequency outcome" },
];

export function CreateBet() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [betTitle, setBetTitle] = useState("");

  const [friendSearch, setFriendSearch] = useState("");
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const [betType, setBetType] = useState<BetType>(null);
  const [betSelection, setBetSelection] = useState("");
  const [wager, setWager] = useState("");

  const [closeDate, setCloseDate] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFriends() {
      const { data } = await supabase
        .from("friends_with_profiles")
        .select("friend_id, username, display_name");
      setFriendsList(data ?? []);
      setFriendsLoading(false);
    }
    loadFriends();
  }, []);

  const filteredFriends = friendsList.filter((f) => {
    const q = friendSearch.toLowerCase();
    return !q || f.username.toLowerCase().includes(q) || (f.display_name ?? "").toLowerCase().includes(q);
  });

  function toggleFriend(id: string) {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleLaunch() {
    if (!betTitle || !betType || !wager || !closeDate) return;
    setLaunching(true);
    setLaunchError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLaunchError("Not signed in.");
      setLaunching(false);
      return;
    }

    const betId = crypto.randomUUID();

    const { error } = await supabase
      .from("bets")
      .insert({
        id: betId,
        title: betTitle,
        bet_type: betType,
        expires_at: new Date(closeDate).toISOString(),
        creator_id: user.id,
        status: "pending",
      });

    if (error) {
      setLaunchError(error.message);
      setLaunching(false);
      return;
    }

    const bet = { id: betId };

    const participants = [
      {
        bet_id: bet.id,
        user_id: user.id,
        status: "accepted",
        chosen_outcome: betSelection || null,
        amount: parseFloat(wager),
      },
      ...selectedFriends.map((friendId) => ({
        bet_id: bet.id,
        user_id: friendId,
        status: "invited",
        chosen_outcome: null,
        amount: parseFloat(wager),
      })),
    ];

    const { error: participantsError } = await supabase.from("bet_participants").insert(participants);

    if (participantsError) {
      setLaunchError(participantsError.message);
      setLaunching(false);
      return;
    }

    setLaunching(false);
    navigate("/home");
  }

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-6 pb-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? navigate("/home") : setStep((s) => s - 1))}
            className="w-9 h-9 rounded-xl glass flex items-center justify-center text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className="text-foreground text-lg font-semibold">Create New Bet</h2>
            <p className="text-muted-foreground text-xs">Step {step} of 4</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 w-8 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {/* Step 1 — Bet Title */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="glass-strong rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">The Bet</span>
              </div>
              <textarea
                value={betTitle}
                onChange={(e) => setBetTitle(e.target.value)}
                placeholder="What's the bet about?"
                rows={3}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none outline-none"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!betTitle.trim()}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2 — Invite Friends */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="glass-strong rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search size={15} />
                <input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                />
              </div>
              <div className="h-px bg-border" />
              {friendsLoading ? (
                <p className="text-muted-foreground text-sm py-2">Loading friends...</p>
              ) : filteredFriends.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">
                  {friendsList.length === 0 ? "No friends yet. Add some on the Friends tab." : "No matches."}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map((f) => {
                    const selected = selectedFriends.includes(f.friend_id);
                    return (
                      <button
                        key={f.friend_id}
                        onClick={() => toggleFriend(f.friend_id)}
                        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors ${selected ? "bg-primary/10" : "hover:bg-white/5"}`}
                      >
                        <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[colorIndex(f.friend_id)]} flex items-center justify-center text-xs font-semibold text-white`}>
                          {getInitials(f.display_name, f.username)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-foreground font-medium leading-tight">
                            {f.display_name ?? f.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{f.username}</p>
                        </div>
                        {selected && <Check size={15} className="text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((id) => {
                  const f = friendsList.find((x) => x.friend_id === id);
                  return (
                    <span key={id} className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium">
                      {f?.display_name ?? f?.username}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                {selectedFriends.length === 0 ? "Skip" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Bet Type + Selection + Wager */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              {BET_TYPES.map((t) => {
                const active = betType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setBetType(t.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${active ? "border-primary bg-primary/10" : "border-border glass"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground text-sm font-semibold">{t.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{t.description}</p>
                      </div>
                      {active && <Check size={16} className="text-primary flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {betType && (
              <div className="glass-strong rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Hash size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Your Pick</span>
                </div>
                <input
                  value={betSelection}
                  onChange={(e) => setBetSelection(e.target.value)}
                  placeholder={
                    betType === "above-below"
                      ? "e.g., Above 100"
                      : betType === "happens-or-not"
                      ? "e.g., Yes / No"
                      : "e.g., More than 3 times"
                  }
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                />
              </div>
            )}

            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Wager</p>
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg font-bold">$</span>
                <input
                  type="number"
                  value={wager}
                  onChange={(e) => setWager(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-foreground text-2xl font-bold outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!betType || !wager}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Summary + Close Date + Launch */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="glass-strong rounded-2xl p-5 space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Summary</p>
              <p className="text-foreground text-base font-semibold">{betTitle}</p>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground font-medium">
                  {BET_TYPES.find((t) => t.id === betType)?.label}
                </span>
              </div>
              {betSelection && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Pick</span>
                  <span className="text-foreground font-medium">{betSelection}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wager</span>
                <span className="text-primary font-bold">${wager}</span>
              </div>
              {selectedFriends.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invited</span>
                  <span className="text-foreground font-medium">
                    {selectedFriends
                      .map((id) => {
                        const f = friendsList.find((x) => x.friend_id === id);
                        return f?.display_name ?? f?.username ?? "";
                      })
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Calendar size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Close Date</span>
              </div>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full bg-transparent text-foreground text-sm outline-none"
              />
            </div>

            {launchError && (
              <p className="text-destructive text-xs text-center">{launchError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching || !closeDate}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
              >
                {launching ? "Launching..." : "Launch Bet"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
