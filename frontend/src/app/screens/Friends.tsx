import { useState } from "react";
import { BottomNav } from "../components/BottomNav";

type Tab = "friends" | "requests" | "find";

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

function Avatar({
  initials,
  colorIndex,
  size = "md",
}: {
  initials: string;
  colorIndex: number;
  size?: "sm" | "md" | "lg";
}) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const sizeClass =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-14 h-14 text-lg"
      : "w-11 h-11 text-sm";
  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

const leaderboard = [
  { id: "1", initials: "MK", name: "Marcus K.", coins: 320, colorIndex: 0 },
  { id: "me", initials: "YO", name: "You", coins: 180, colorIndex: 4 },
  { id: "2", initials: "JP", name: "Jess P.", coins: 40, colorIndex: 1 },
];

const friends = [
  {
    id: "1",
    initials: "MK",
    name: "Marcus Kim",
    username: "@marcusk",
    sharedGroups: 3,
    wins: 6,
    losses: 2,
    activeBets: 2,
    colorIndex: 0,
  },
  {
    id: "2",
    initials: "JP",
    name: "Jess Park",
    username: "@jessp",
    sharedGroups: 2,
    wins: 4,
    losses: 4,
    activeBets: 1,
    colorIndex: 1,
  },
  {
    id: "3",
    initials: "DL",
    name: "Dev Lara",
    username: "@devlara",
    sharedGroups: 1,
    wins: 2,
    losses: 6,
    activeBets: 0,
    colorIndex: 2,
  },
  {
    id: "4",
    initials: "RL",
    name: "Riley Lee",
    username: "@rileyl",
    sharedGroups: 1,
    wins: 5,
    losses: 1,
    activeBets: 3,
    colorIndex: 3,
  },
];

const incomingRequests = [
  {
    id: "r1",
    initials: "AJ",
    name: "Alex Johnson",
    username: "@alexj",
    mutualFriends: 2,
    sentAgo: "2h ago",
    colorIndex: 4,
  },
  {
    id: "r2",
    initials: "SM",
    name: "Sam Mora",
    username: "@sammora",
    mutualFriends: 1,
    sentAgo: "1d ago",
    colorIndex: 6,
  },
];

const sentRequests = [
  {
    id: "s1",
    initials: "TN",
    name: "Taylor Ng",
    username: "@taylorn",
    sentAgo: "3d ago",
    colorIndex: 5,
  },
];

const suggestions = [
  {
    id: "p1",
    initials: "CW",
    name: "Chris Wu",
    username: "@chriswu",
    mutualFriends: 1,
    colorIndex: 4,
  },
  {
    id: "p2",
    initials: "NB",
    name: "Nina Bose",
    username: "@ninab",
    mutualFriends: 3,
    colorIndex: 6,
  },
  {
    id: "p3",
    initials: "PK",
    name: "Priya Kanna",
    username: "@priyak",
    mutualFriends: 0,
    colorIndex: 5,
  },
];

const RANK_LABELS = ["1", "2", "3"];

export function Friends() {
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());

  const pendingIncoming = incomingRequests.filter(
    (r) => !acceptedIds.has(r.id) && !declinedIds.has(r.id)
  );
  const incomingCount = pendingIncoming.length;

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-2xl font-bold">Friends</h1>
          <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg leading-none">
            +
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search friends or @username"
            className="w-full px-4 py-3 pl-10 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(
            [
              { id: "friends", label: "Friends" },
              { id: "requests", label: "Requests", badge: incomingCount },
              { id: "find", label: "Find people" },
            ] as { id: Tab; label: string; badge?: number }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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

            {/* Leaderboard */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-4">
                LEADERBOARD THIS WEEK
              </p>
              <div className="space-y-4">
                {leaderboard.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <span className={`text-sm w-6 text-center tabular-nums font-bold ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{RANK_LABELS[i]}</span>
                    <Avatar initials={entry.initials} colorIndex={entry.colorIndex} />
                    <span className={`flex-1 ${i === 0 ? "text-foreground font-semibold" : "text-foreground"}`}>
                      {entry.name}
                    </span>
                    <span className={`text-sm tabular-nums ${i === 0 ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                      +{entry.coins}
                      <span className="text-xs font-normal ml-0.5">pts</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Friends List */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-2">
                YOUR FRIENDS
              </p>
              <div className="divide-y divide-border">
                {friends.map((friend) => (
                  <div key={friend.id} className="py-4 flex items-center gap-3">
                    <Avatar initials={friend.initials} colorIndex={friend.colorIndex} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium leading-tight">{friend.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {friend.username} · {friend.sharedGroups} group{friend.sharedGroups !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="text-sm tabular-nums text-foreground">
                        <span className="font-semibold">{friend.wins}</span>
                        <span className="text-muted-foreground text-xs">W</span>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="font-semibold">{friend.losses}</span>
                        <span className="text-muted-foreground text-xs">L</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {friend.activeBets === 0
                          ? "no bets"
                          : `${friend.activeBets} live`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6 pt-1">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">
                INCOMING {incomingCount > 0 && `(${incomingCount})`}
              </p>
              <div className="space-y-3">
                {pendingIncoming.map((req) => (
                  <div key={req.id} className="flex gap-3 py-1">
                    <Avatar initials={req.initials} colorIndex={req.colorIndex} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium leading-tight">{req.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {req.username} · {req.mutualFriends} mutual · {req.sentAgo}
                      </p>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={() => setAcceptedIds((s) => new Set([...s, req.id]))}
                          className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setDeclinedIds((s) => new Set([...s, req.id]))}
                          className="px-4 py-1.5 rounded-lg text-muted-foreground text-sm hover:text-foreground transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {incomingCount === 0 && (
                  <p className="text-muted-foreground text-sm">You're all caught up.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">
                SENT
              </p>
              <div className="space-y-3">
                {sentRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 py-1">
                    <Avatar initials={req.initials} colorIndex={req.colorIndex} />
                    <div>
                      <p className="text-foreground font-medium leading-tight">{req.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {req.username} · pending · {req.sentAgo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Find People Tab */}
        {activeTab === "find" && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-3">
              SUGGESTED
            </p>
            <div className="divide-y divide-border">
              {suggestions.map((person) => (
                <div key={person.id} className="py-4 flex items-center gap-3">
                  <Avatar initials={person.initials} colorIndex={person.colorIndex} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium leading-tight">{person.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {person.username}
                      {person.mutualFriends > 0
                        ? ` · ${person.mutualFriends} mutual`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setAddedIds((s) => new Set([...s, person.id]))}
                    disabled={addedIds.has(person.id)}
                    className={`text-sm font-medium transition-colors ${
                      addedIds.has(person.id)
                        ? "text-muted-foreground cursor-default"
                        : "text-primary hover:opacity-70"
                    }`}
                  >
                    {addedIds.has(person.id) ? "Sent" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <BottomNav active="friends" />
    </div>
  );
}
