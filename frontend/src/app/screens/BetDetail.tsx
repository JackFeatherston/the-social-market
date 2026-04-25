import { Link, useParams } from "react-router";

export function BetDetail() {
  const { id } = useParams();

  const betData = {
    title: "Will it snow this weekend?",
    creator: "Alex",
    creatorAvatar: "👤",
    pot: "$45",
    status: "Active",
    statusColor: "bg-primary",
    outcomes: [
      { name: "Yes", percentage: 60, amount: "$27", color: "bg-success" },
      { name: "No", percentage: 40, amount: "$18", color: "bg-destructive" },
    ],
    participants: [
      {
        id: "1",
        name: "Alex",
        avatar: "👤",
        side: "Yes",
        amount: "$15",
        sideColor: "text-success",
      },
      {
        id: "2",
        name: "Sarah",
        avatar: "👩",
        side: "Yes",
        amount: "$12",
        sideColor: "text-success",
      },
      {
        id: "3",
        name: "Mike",
        avatar: "👨",
        side: "No",
        amount: "$18",
        sideColor: "text-destructive",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-8 pb-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <button className="text-primary text-2xl">←</button>
          </Link>
          <h2 className="text-foreground flex-1">Bet Details</h2>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
              {betData.creatorAvatar}
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Created by</p>
              <p className="text-foreground">{betData.creator}</p>
            </div>
          </div>

          <h2 className="text-foreground">{betData.title}</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Pot</p>
              <p className="text-primary text-2xl">{betData.pot}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full ${betData.statusColor} bg-opacity-20`}
            >
              {betData.status}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Pot Distribution</h3>
          <div className="bg-card rounded-3xl p-6 border border-border space-y-4">
            {betData.outcomes.map((outcome, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">{outcome.name}</span>
                  <span className="text-foreground">{outcome.amount}</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${outcome.color} rounded-full`}
                    style={{ width: `${outcome.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground">Participants</h3>
          <div className="space-y-3">
            {betData.participants.map((participant) => (
              <div
                key={participant.id}
                className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                    {participant.avatar}
                  </div>
                  <div>
                    <p className="text-foreground">{participant.name}</p>
                    <p className={`text-sm ${participant.sideColor}`}>
                      {participant.side}
                    </p>
                  </div>
                </div>
                <span className="text-foreground">{participant.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Settle Bet
        </button>
      </div>
    </div>
  );
}
