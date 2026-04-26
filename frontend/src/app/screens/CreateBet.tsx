import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, TrendingUp, Check, Search, Calendar } from "lucide-react";
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
  { id: "happens-or-not", label: "Happens or Not", description: "Yes/No outcome bet" },
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

  // happens-or-not
  const [yesNo, setYesNo] = useState<"Yes" | "No" | "">("");
  // above-below
  const [direction, setDirection] = useState<"Above" | "Below" | "">("");
  const [threshold, setThreshold] = useState("");
  // how-many
  const [howMany, setHowMany] = useState(5);

  // settlement
  type SettlementMethod = 'group_vote' | 'trusted_vote' | 'location';
  type LocationMode = 'arrival' | 'presence' | 'count';
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>('group_vote');
  const [locationMode, setLocationMode] = useState<LocationMode | ''>('');
  const [locationResultType, setLocationResultType] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [checkInRadius, setCheckInRadius] = useState('100');
  const [checkInDeadline, setCheckInDeadline] = useState('');
  const [trackingStart, setTrackingStart] = useState('');
  const [trackingEnd, setTrackingEnd] = useState('');
  const [locationTargetUserId, setLocationTargetUserId] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const chosenOutcome =
    betType === "happens-or-not" ? yesNo || null :
    betType === "above-below" ? (direction && threshold ? `${direction} ${threshold}` : null) :
    betType === "how-many" ? String(howMany) :
    null;

  const pickIsValid =
    betType === "happens-or-not" ? !!yesNo :
    betType === "above-below" ? !!direction && !!threshold :
    betType === "how-many" ? true :
    false;

  const locationIsValid =
    settlementMethod !== 'location' || (
      !!locationMode && !!locationName && !!locationLat && !!locationLng &&
      (locationMode !== 'arrival'  || !!locationResultType) &&
      (locationMode !== 'presence' || (!!locationTargetUserId && !!checkInDeadline)) &&
      (locationMode !== 'count'    || (!!locationTargetUserId && !!trackingStart && !!trackingEnd))
    );

  const [wager, setWager] = useState("");

  const [closeDate, setCloseDate] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);

  useEffect(() => {
    async function loadFriends() {
      const { data } = await supabase
        .from("friends_with_profiles")
        .select("friend_id, username, display_name");
      setFriendsList(data ?? []);
      setFriendsLoading(false);
    }
    async function loadBalance() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .single();
        setUserBalance(data?.balance ?? null);
      }
    }
    loadFriends();
    loadBalance();
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

  async function geocodeAddress() {
    if (!locationAddress.trim()) return;
    setGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationAddress)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) {
        setGeocodeError('Address not found. Try a more specific search.');
        setGeocoding(false);
        return;
      }
      setLocationLat(data[0].lat);
      setLocationLng(data[0].lon);
      setLocationName(data[0].display_name);
    } catch {
      setGeocodeError('Failed to search. Check your connection.');
    }
    setGeocoding(false);
  }

  async function handleLaunch() {
    if (!betTitle || !betType || !wager || !closeDate) return;
    setLaunching(true);
    setLaunchError(null);

    if (userBalance !== null && parseFloat(wager) > userBalance) {
      setLaunchError(`Insufficient balance. You have $${userBalance.toFixed(2)} available.`);
      setLaunching(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLaunchError("Not signed in.");
      setLaunching(false);
      return;
    }

    const betId = crypto.randomUUID();

    const { error } = await supabase.from("bets").insert({
      id: betId,
      title: betTitle,
      bet_type: betType,
      expires_at: new Date(closeDate).toISOString(),
      creator_id: user.id,
      status: "pending",
      settlement_method: settlementMethod,
      ...(betType === "above-below" && threshold ? { threshold: parseFloat(threshold) } : {}),
      ...(settlementMethod === 'location' && {
        location_mode:            locationMode || null,
        location_result_type:     locationResultType || null,
        location_name:            locationName || null,
        location_lat:             locationLat  ? parseFloat(locationLat)  : null,
        location_lng:             locationLng  ? parseFloat(locationLng)  : null,
        check_in_radius_meters:   checkInRadius ? parseInt(checkInRadius, 10) : 100,
        check_in_deadline:        checkInDeadline ? new Date(checkInDeadline).toISOString() : null,
        tracking_start:           trackingStart ? new Date(trackingStart).toISOString() : null,
        tracking_end:             trackingEnd   ? new Date(trackingEnd).toISOString()   : null,
        location_target_user_id:  locationTargetUserId || null,
      }),
    });

    if (error) {
      setLaunchError(error.message);
      setLaunching(false);
      return;
    }

    const participants = [
      {
        bet_id: betId,
        user_id: user.id,
        status: "accepted",
        chosen_outcome: chosenOutcome,
        amount: parseFloat(wager),
      },
      ...selectedFriends.map((friendId) => ({
        bet_id: betId,
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
              <div key={s} className={`h-1 w-8 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
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
                          <p className="text-sm text-foreground font-medium leading-tight">{f.display_name ?? f.username}</p>
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
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">
                {selectedFriends.length === 0 ? "Skip" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Bet Type + Pick + Wager */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Settlement method selector */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">How will this bet settle?</p>
              {([
                { id: 'group_vote',   label: 'Group Vote',        desc: 'All participants vote on the outcome' },
                { id: 'trusted_vote', label: 'Trusted Vote',      desc: 'A trusted participant gets double-weight vote' },
                { id: 'location',     label: 'Location Check-In', desc: 'Settled by GPS check-ins at a physical place' },
              ] as { id: SettlementMethod; label: string; desc: string }[]).map((m) => (
                <button key={m.id} onClick={() => setSettlementMethod(m.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    settlementMethod === m.id ? 'border-primary bg-primary/10' : 'border-border glass'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground text-sm font-semibold">{m.label}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{m.desc}</p>
                    </div>
                    {settlementMethod === m.id && <Check size={16} className="text-primary flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Location sub-fields */}
            {settlementMethod === 'location' && (
              <div className="glass-strong rounded-2xl p-4 space-y-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Location Details</p>

                {/* Mode */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Check-in mode</p>
                  <div className="flex gap-2">
                    {(['arrival', 'presence', 'count'] as LocationMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setLocationMode(m); setLocationResultType(''); setLocationTargetUserId(''); }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all capitalize ${
                          locationMode === m ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground glass'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address search */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Search address</p>
                  <div className="flex gap-2">
                    <input
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && geocodeAddress()}
                      placeholder="e.g. 123 Main St, New York"
                      className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={geocodeAddress}
                      disabled={geocoding || !locationAddress.trim()}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
                    >
                      {geocoding ? '...' : 'Search'}
                    </button>
                  </div>
                  {geocodeError && <p className="text-destructive text-xs">{geocodeError}</p>}
                </div>

                {/* Resolved location confirmation */}
                {locationName && (
                  <div className="space-y-0.5 p-3 rounded-xl bg-white/5">
                    <p className="text-foreground text-xs font-medium">{locationName}</p>
                    <p className="text-muted-foreground text-xs">{locationLat}, {locationLng}</p>
                  </div>
                )}

                {/* Radius */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Check-in radius (meters)</p>
                  <input
                    type="number"
                    value={checkInRadius}
                    onChange={(e) => setCheckInRadius(e.target.value)}
                    placeholder="100"
                    className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {/* Arrival-specific */}
                {locationMode === 'arrival' && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Result type</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { id: 'first_to_arrive',  label: 'First to arrive' },
                          { id: 'last_to_arrive',   label: 'Last to arrive' },
                          { id: 'late_by_deadline', label: 'Late by deadline (who missed it)' },
                        ].map((rt) => (
                          <button
                            key={rt.id}
                            onClick={() => setLocationResultType(rt.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                              locationResultType === rt.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground glass'
                            }`}
                          >
                            {rt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Deadline (optional)</p>
                      <input
                        type="datetime-local"
                        value={checkInDeadline}
                        onChange={(e) => setCheckInDeadline(e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Presence-specific */}
                {locationMode === 'presence' && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Target participant</p>
                      <select
                        value={locationTargetUserId}
                        onChange={(e) => setLocationTargetUserId(e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm outline-none"
                      >
                        <option value="">Select a participant...</option>
                        {selectedFriends.map((fid) => {
                          const f = friendsList.find((x) => x.friend_id === fid);
                          return (
                            <option key={fid} value={fid}>
                              {f?.display_name ?? f?.username ?? fid}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <input
                        type="datetime-local"
                        value={checkInDeadline}
                        onChange={(e) => setCheckInDeadline(e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Count-specific */}
                {locationMode === 'count' && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Target participant</p>
                      <select
                        value={locationTargetUserId}
                        onChange={(e) => setLocationTargetUserId(e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm outline-none"
                      >
                        <option value="">Select a participant...</option>
                        {selectedFriends.map((fid) => {
                          const f = friendsList.find((x) => x.friend_id === fid);
                          return (
                            <option key={fid} value={fid}>
                              {f?.display_name ?? f?.username ?? fid}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tracking start</p>
                        <input
                          type="datetime-local"
                          value={trackingStart}
                          onChange={(e) => setTrackingStart(e.target.value)}
                          className="w-full bg-transparent text-foreground text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tracking end</p>
                        <input
                          type="datetime-local"
                          value={trackingEnd}
                          onChange={(e) => setTrackingEnd(e.target.value)}
                          className="w-full bg-transparent text-foreground text-sm outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bet type selector */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">What type of bet is this?</p>
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

            {/* Per-type pick UI */}
            {betType === "happens-or-not" && (
              <div className="glass-strong rounded-2xl p-4 space-y-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Pick</p>
                <div className="flex gap-3">
                  {(["Yes", "No"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setYesNo(opt)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        yesNo === opt ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground glass"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {betType === "above-below" && (
              <div className="glass-strong rounded-2xl p-4 space-y-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Pick</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Threshold value</p>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-transparent text-foreground text-2xl font-bold outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <div className="flex gap-3">
                    {(["Above", "Below"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setDirection(opt)}
                        className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          direction === opt ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground glass"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {direction && threshold && (
                  <p className="text-primary text-sm font-semibold">→ {direction} {threshold}</p>
                )}
              </div>
            )}

            {betType === "how-many" && (
              <div className="glass-strong rounded-2xl p-4 space-y-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Pick</p>
                <div className="text-center py-2">
                  <span className="text-5xl font-bold text-foreground">{howMany}</span>
                  <span className="text-muted-foreground text-lg ml-2">times</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={howMany}
                  onChange={(e) => setHowMany(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
            )}

            {/* Wager */}
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Wager</p>
                <p className="text-xs text-muted-foreground">
                  Balance: ${userBalance !== null ? userBalance.toFixed(2) : "..."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg font-bold">$</span>
                <input
                  type="number"
                  value={wager}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow only numbers with up to 2 decimal places
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setWager(value);
                    }
                  }}
                  placeholder="0"
                  min="0"
                  max={userBalance ?? undefined}
                  className="flex-1 bg-transparent text-foreground text-2xl font-bold outline-none placeholder:text-muted-foreground"
                />
              </div>
              {wager && userBalance !== null && parseFloat(wager) > userBalance && (
                <p className="text-destructive text-xs">Exceeds your available balance.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold">Back</button>
              <button
                onClick={() => setStep(4)}
                disabled={!betType || !pickIsValid || !wager || (userBalance !== null && parseFloat(wager) > userBalance) || !locationIsValid}
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
                <span className="text-foreground font-medium">{BET_TYPES.find((t) => t.id === betType)?.label}</span>
              </div>
              {chosenOutcome && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Pick</span>
                  <span className="text-foreground font-medium">
                    {betType === "how-many" ? `${chosenOutcome} times` : chosenOutcome}
                  </span>
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
                    {selectedFriends.map((id) => {
                      const f = friendsList.find((x) => x.friend_id === id);
                      return f?.display_name ?? f?.username ?? "";
                    }).join(", ")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Settlement</span>
                <span className="text-foreground font-medium">
                  {settlementMethod === 'group_vote'   ? 'Group Vote' :
                   settlementMethod === 'trusted_vote' ? 'Trusted Vote' :
                   `Location — ${locationMode}`}
                </span>
              </div>
              {settlementMethod === 'location' && locationName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Place</span>
                  <span className="text-foreground font-medium">{locationName}</span>
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
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-2xl glass text-foreground text-sm font-semibold">Back</button>
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
