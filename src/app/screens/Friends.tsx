import { Link } from "react-router";
import { BottomNav } from "../components/BottomNav";

export function Friends() {
  const friends = [
    {
      id: "1",
      name: "Sarah Johnson",
      username: "@sarahj",
      avatar: "👩",
    },
    {
      id: "2",
      name: "Mike Chen",
      username: "@mikechen",
      avatar: "👨",
    },
    {
      id: "3",
      name: "Emma Davis",
      username: "@emmad",
      avatar: "👧",
    },
    {
      id: "4",
      name: "Alex Rivera",
      username: "@alexr",
      avatar: "👤",
    },
    {
      id: "5",
      name: "Jordan Lee",
      username: "@jordanlee",
      avatar: "👨‍💼",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/home">
            <button className="text-primary text-2xl">←</button>
          </Link>
          <h2 className="text-foreground">Friends</h2>
          <button className="text-primary text-2xl">+</button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search or add friends..."
            className="w-full px-5 py-4 pl-12 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
            🔍
          </span>
        </div>

        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                {friend.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{friend.name}</p>
                <p className="text-muted-foreground text-sm truncate">
                  {friend.username}
                </p>
              </div>
              <Link to="/create-bet">
                <button className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors whitespace-nowrap">
                  Bet Together
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="friends" />
    </div>
  );
}
