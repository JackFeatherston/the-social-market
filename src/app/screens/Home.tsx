import { Link } from "react-router";
import { BottomNav } from "../components/BottomNav";

export function Home() {
  const activeBets = [
    {
      id: "1",
      title: "Will it snow this weekend?",
      participants: ["👤", "👥", "👨"],
      pot: "$45",
      status: "Active",
      statusColor: "bg-primary",
    },
    {
      id: "2",
      title: "Who wins the playoffs?",
      participants: ["👤", "👥"],
      pot: "$30",
      status: "Pending",
      statusColor: "bg-muted",
    },
    {
      id: "3",
      title: "Restaurant opens on time?",
      participants: ["👤", "👥", "👨", "👩"],
      pot: "$60",
      status: "Resolving",
      statusColor: "bg-chart-4",
    },
  ];

  const recentActivity = [
    {
      id: "1",
      user: "Sarah",
      action: "won",
      bet: "Lakers game score",
      amount: "$25",
      color: "text-success",
    },
    {
      id: "2",
      user: "Mike",
      action: "lost",
      bet: "Weather prediction",
      amount: "$15",
      color: "text-destructive",
    },
    {
      id: "3",
      user: "Alex",
      action: "joined",
      bet: "Will it snow this weekend?",
      amount: "$10",
      color: "text-primary",
    },
    {
      id: "4",
      user: "Emma",
      action: "won",
      bet: "Traffic delay bet",
      amount: "$20",
      color: "text-success",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground">Hey, Alex 👋</h2>
          <div className="px-4 py-2 rounded-full bg-card border border-border flex items-center gap-2">
            <span className="text-primary">💰</span>
            <span className="text-foreground">$240</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Your Active Bets</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {activeBets.map((bet) => (
              <Link key={bet.id} to={`/bet/${bet.id}`}>
                <div className="min-w-[280px] bg-card rounded-3xl p-5 border border-border space-y-3 hover:border-primary/50 transition-colors">
                  <h4 className="text-foreground line-clamp-2 min-h-[3rem]">
                    {bet.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    {bet.participants.map((avatar, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                      >
                        {avatar}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary">{bet.pot}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${bet.statusColor} bg-opacity-20`}
                    >
                      {bet.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-foreground">
                    <span className={activity.color}>{activity.user}</span>{" "}
                    {activity.action}{" "}
                    <span className="text-muted-foreground">
                      {activity.bet}
                    </span>
                  </p>
                </div>
                <span className={activity.color}>{activity.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link
        to="/create-bet"
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10"
      >
        <button className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/50 flex items-center justify-center hover:scale-110 transition-transform">
          <span className="text-3xl">+</span>
        </button>
      </Link>

      <BottomNav active="home" />
    </div>
  );
}
