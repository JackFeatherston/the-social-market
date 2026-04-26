import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";

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

function Avatar({ id, displayName, username }: { id: string; displayName: string | null; username: string }) {
  const color = AVATAR_COLORS[colorIndex(id)];
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0`}>
      {getInitials(displayName, username)}
    </div>
  );
}

type BetOption = {
  id: string;
  title: string;
  bet_type: "above-below" | "happens-or-not" | "how-many";
  creator_id: string;
  creator_username: string;
  creator_display_name: string | null;
};

type PersonWithBets = {
  id: string;
  username: string;
  display_name: string | null;
  bets: BetOption[];
};

type Participant = {
  user_id: string;
  username: string;
  display_name: string | null;
  amount: number;
  chosen_outcome: string | null;
};

function outcomeLabels(betType: BetOption["bet_type"]): [string, string] {
  if (betType === "above-below") return ["Above", "Below"];
  if (betType === "how-many") return ["Over", "Under"];
  return ["Yes", "No"];
}

function betTypeLabel(betType: BetOption["bet_type"]): string {
  if (betType === "above-below") return "Above / Below";
  if (betType === "how-many") return "How Many";
  return "Yes / No";
}

export function PlaceBet() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PersonWithBets[]>([]);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [selectedBet, setSelectedBet] = useState<BetOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [wager, setWager] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchInvitedBets();
    supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setUserBalance(data?.balance ?? null));
  }, [user]);

  async function fetchInvitedBets() {
    setLoading(true);
    const { data: invites } = await supabase
      .from("bet_participants")
      .select("bet_id")
      .eq("user_id", user!.id)
      .eq("status", "invited");

    const betIds = (invites ?? []).map((r: any) => r.bet_id);
    if (betIds.length === 0) { setLoading(false); return; }

    const { data: bets } = await supabase
      .from("bets_summary")
      .select("id, title, bet_type, creator_id, creator_username, creator_display_name")
      .in("id", betIds)
      .in("status", ["pending", "active"]);

    const grouped = new Map<string, PersonWithBets>();
    for (const b of bets ?? []) {
      if (!grouped.has(b.creator_id)) {
        grouped.set(b.creator_id, {
          id: b.creator_id,
          username: b.creator_username,
          display_name: b.creator_display_name,
          bets: [],
        });
      }
      grouped.get(b.creator_id)!.bets.push(b as BetOption);
    }
    setPeople([...grouped.values()]);
    setLoading(false);
  }

  async function fetchParticipants(betId: string) {
    const { data } = await supabase
      .from("bet_participants")
      .select("user_id, amount, chosen_outcome, profiles(username, display_name)")
      .eq("bet_id", betId)
      .eq("status", "accepted");

    setParticipants(
      (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        username: r.profiles?.username ?? "",
        display_name: r.profiles?.display_name ?? null,
        amount: r.amount,
        chosen_outcome: r.chosen_outcome,
      }))
    );
  }

  function selectBet(bet: BetOption) {
    setSelectedBet(bet);
    fetchParticipants(bet.id);
  }

  function handleNext() {
    if (!selectedBet) return;
    setStep(2);
  }

  async function handlePlaceBet() {
    if (!selectedBet || !selectedOutcome || !wager || !user) return;
    setSubmitting(true);
    setSubmitError(null);

    if (userBalance === null || parseFloat(wager) > userBalance) {
      setSubmitError(
        userBalance === null
          ? "Unable to verify your balance. Please try again."
          : `Insufficient balance. You have $${userBalance.toFixed(2)} available.`
      );
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("bet_participants")
      .update({ status: "accepted", chosen_outcome: selectedOutcome, amount: parseFloat(wager) })
      .eq("bet_id", selectedBet.id)
      .eq("user_id", user.id);

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }
    navigate("/home");
  }

  const filteredPeople = people.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || (p.display_name ?? "").toLowerCase().includes(q) || p.username.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-8 pb-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => step === 1 ? navigate("/home") : setStep(1)}
            className="text-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-foreground flex-1">Place Existing Bet</h2>
          <span className="text-muted-foreground text-sm">Step {step}/2</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="text-foreground font-medium">Select Person or Group</label>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people or groups..."
                className="w-full px-4 py-3 pl-10 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse" />)}
              </div>
            ) : filteredPeople.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending bet invites.</p>
            ) : (
              <div className="space-y-2">
                {filteredPeople.map((person) => (
                  <div key={person.id}>
                    {/* Person row */}
                    <button
                      onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                        expandedPerson === person.id ? "bg-primary/5 border-primary/40" : "bg-card border-border hover:border-primary/30"
                      }`}
                    >
                      <Avatar id={person.id} displayName={person.display_name} username={person.username} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium">{person.display_name ?? person.username}</p>
                        <p className="text-muted-foreground text-xs">{person.bets.length} active bet{person.bets.length !== 1 ? "s" : ""}</p>
                      </div>
                      {expandedPerson === person.id && (
                        <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 011.414-1.414L10 10.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Expanded bets */}
                    {expandedPerson === person.id && (
                      <div className="ml-4 mt-1 space-y-1">
                        {person.bets.map((bet) => (
                          <button
                            key={bet.id}
                            onClick={() => selectBet(bet)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              selectedBet?.id === bet.id
                                ? "bg-emerald-500/10 border-emerald-500/60"
                                : "bg-card border-border hover:border-primary/30"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedBet?.id === bet.id ? "border-emerald-500" : "border-border"
                            }`}>
                              {selectedBet?.id === bet.id && (
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">{bet.title}</p>
                              <p className="text-muted-foreground text-xs">{betTypeLabel(bet.bet_type)}</p>
                            </div>
                            {selectedBet?.id === bet.id && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!selectedBet}
              className="w-full px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedBet && (
          <div className="space-y-5">
            {/* Selected bet card */}
            <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-muted-foreground text-xs">{betTypeLabel(selectedBet.bet_type)}</p>
                <p className="text-foreground font-semibold">{selectedBet.title}</p>
              </div>
            </div>

            {/* Your Selection */}
            <div className="space-y-2">
              <label className="text-foreground font-medium">Your Selection</label>
              <div className="flex gap-3">
                {outcomeLabels(selectedBet.bet_type).map((label) => (
                  <button
                    key={label}
                    onClick={() => setSelectedOutcome(label)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all border ${
                      selectedOutcome === label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Your Wager */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-foreground font-medium">Your Wager</label>
                <span className="text-muted-foreground text-xs">
                  Balance: ${userBalance !== null ? userBalance.toFixed(2) : "..."}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground">$</span>
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
                  className="w-full pl-8 pr-4 py-4 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                />
              </div>
              {wager && userBalance !== null && parseFloat(wager) > userBalance && (
                <p className="text-destructive text-xs">Exceeds your available balance.</p>
              )}
            </div>

            {/* Group Participation */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <label className="text-foreground font-medium">Group Participation</label>
                <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                  {participants.map((p) => (
                    <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar id={p.user_id} displayName={p.display_name} username={p.username} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium">{p.display_name ?? p.username}</p>
                        {p.chosen_outcome && (
                          <p className="text-muted-foreground text-xs">{p.chosen_outcome}</p>
                        )}
                      </div>
                      <span className="text-foreground text-sm font-medium">${p.amount.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitError && (
              <p className="text-destructive text-sm text-center">{submitError}</p>
            )}

            <button
              onClick={handlePlaceBet}
              disabled={!selectedOutcome || !wager || submitting || userBalance === null || parseFloat(wager) > userBalance}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Placing..." : "Place Bet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
