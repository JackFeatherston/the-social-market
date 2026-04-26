import { Link } from "react-router";
import { Home, Users, Plus, TrendingUp, User } from "lucide-react";
import { useBetMenu } from "../context/BetMenuContext";

interface BottomNavProps {
  active: "home" | "friends" | "create" | "bets" | "profile";
}

export function BottomNav({ active }: BottomNavProps) {
  const openBetMenu = useBetMenu();
  return (
    <div className="flex-shrink-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 z-50 mt-auto">
      <div className="flex items-center justify-around px-4 py-2 safe-area-bottom">
        <Link to="/home">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "home" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Home size={22} strokeWidth={active === "home" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Home</span>
          </button>
        </Link>

        <Link to="/friends">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "friends" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Users size={22} strokeWidth={active === "friends" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Friends</span>
          </button>
        </Link>

        <button
          onClick={openBetMenu}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 -mt-6"
        >
          <div
            className={`w-14 h-14 rounded-[18px] flex items-center justify-center shadow-xl ${
              active === "create"
                ? "bg-primary shadow-primary/40"
                : "bg-primary shadow-primary/30"
            }`}
          >
            <Plus size={28} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[9px] font-medium text-foreground mt-1">Create</span>
        </button>

        <Link to="/bets">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "bets" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <TrendingUp size={22} strokeWidth={active === "bets" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Bets</span>
          </button>
        </Link>

        <Link to="/home">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User size={22} strokeWidth={active === "profile" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Profile</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
