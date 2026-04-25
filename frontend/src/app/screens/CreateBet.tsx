import { useState } from "react";
import { Link } from "react-router";

type BetType = "above-below" | "happens-or-not" | "how-many" | null;

export function CreateBet() {
  const [step, setStep] = useState(1);
  const [betTitle, setBetTitle] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [betType, setBetType] = useState<BetType>(null);
  const [threshold, setThreshold] = useState("");
  const [wager, setWager] = useState("");

  const friends = [
    { id: "1", name: "Sarah", avatar: "👩" },
    { id: "2", name: "Mike", avatar: "👨" },
    { id: "3", name: "Emma", avatar: "👧" },
    { id: "4", name: "Jordan", avatar: "👨‍💼" },
  ];

  const betTypes = [
    {
      id: "above-below" as BetType,
      icon: "📈",
      title: "Above / Below",
      description: "Bet whether a value exceeds or falls under a threshold",
    },
    {
      id: "happens-or-not" as BetType,
      icon: "✅",
      title: "Happens or Not",
      description: "Binary yes/no outcome bet",
    },
    {
      id: "how-many" as BetType,
      icon: "🔢",
      title: "How Many Times",
      description: "Bet on a count/frequency outcome",
    },
  ];

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const totalPot = wager
    ? `$${(parseFloat(wager) * (selectedFriends.length + 1)).toFixed(0)}`
    : "$0";

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-8 pb-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <button className="text-primary text-2xl">←</button>
          </Link>
          <h2 className="text-foreground flex-1">Create New Bet</h2>
          <div className="text-muted-foreground">Step {step}/4</div>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-foreground">What's the bet?</label>
              <input
                type="text"
                value={betTitle}
                onChange={(e) => setBetTitle(e.target.value)}
                placeholder="e.g., Will it snow this weekend?"
                className="w-full px-5 py-4 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!betTitle}
              className="w-full px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-foreground">Invite Friends</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search friends..."
                  className="w-full px-5 py-4 pl-12 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                  🔍
                </span>
              </div>
            </div>

            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((friendId) => {
                  const friend = friends.find((f) => f.id === friendId);
                  return (
                    <div
                      key={friendId}
                      className="px-3 py-2 rounded-full bg-primary/20 border border-primary/50 flex items-center gap-2"
                    >
                      <span>{friend?.avatar}</span>
                      <span className="text-foreground">{friend?.name}</span>
                      <button
                        onClick={() => toggleFriend(friendId)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => toggleFriend(friend.id)}
                  className={`w-full p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                    selectedFriends.includes(friend.id)
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                    {friend.avatar}
                  </div>
                  <span className="text-foreground">{friend.name}</span>
                  {selectedFriends.includes(friend.id) && (
                    <span className="ml-auto text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-4 rounded-2xl bg-muted text-foreground hover:opacity-90 transition-opacity"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedFriends.length === 0}
                className="flex-1 px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-foreground">Choose Bet Type</label>
              <div className="space-y-3">
                {betTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBetType(type.id)}
                    className={`w-full p-5 rounded-3xl border transition-all text-left ${
                      betType === type.id
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{type.icon}</div>
                      <div className="flex-1">
                        <h4 className="text-foreground mb-1">{type.title}</h4>
                        <p className="text-muted-foreground text-sm">
                          {type.description}
                        </p>
                      </div>
                      {betType === type.id && (
                        <span className="text-primary text-xl">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {betType === "above-below" && (
              <div className="space-y-2">
                <label className="text-foreground">Set Threshold</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Enter threshold value"
                  className="w-full px-5 py-4 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-4 rounded-2xl bg-muted text-foreground hover:opacity-90 transition-opacity"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!betType}
                className="flex-1 px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-foreground">Set Your Wager</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground text-lg">
                  $
                </span>
                <input
                  type="number"
                  value={wager}
                  onChange={(e) => setWager(e.target.value)}
                  placeholder="0"
                  className="w-full px-5 py-4 pl-10 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                />
              </div>
            </div>

            <div className="bg-card rounded-3xl p-6 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your wager</span>
                <span className="text-foreground">${wager || "0"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span className="text-foreground">
                  {selectedFriends.length + 1}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-foreground">Total Pot</span>
                <span className="text-primary text-2xl">{totalPot}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-6 py-4 rounded-2xl bg-muted text-foreground hover:opacity-90 transition-opacity"
              >
                Back
              </button>
              <Link to="/home" className="flex-1">
                <button
                  disabled={!wager}
                  className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-primary to-success text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Launch Bet 🚀
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
