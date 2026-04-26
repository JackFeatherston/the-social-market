import { Link } from "react-router";
import { Home, Users, TrendingUp, User } from "lucide-react";
import { useBetMenu } from "../context/BetMenuContext";

interface BottomNavProps {
  active: "home" | "friends" | "create" | "bets" | "profile";
}

export function BottomNav({ active }: BottomNavProps) {
  const openBetMenu = useBetMenu();
  return (
    <div className="flex-shrink-0 bg-[#0B0D10]/95 backdrop-blur-xl border-t border-white/10 z-50 mt-auto">
      <div className="flex items-center justify-around px-4 py-2 safe-area-bottom">
        <Link to="/home">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "home" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Home size={22} strokeWidth={active === "home" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
        </Link>

        <Link to="/friends">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "friends" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Users size={22} strokeWidth={active === "friends" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Friends</span>
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
            <svg
              width="32"
              height="32"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* First die - showing 3 */}
              <rect x="2" y="8" width="24" height="24" rx="4" fill="white" opacity="0.2" />
              <rect x="2" y="8" width="24" height="24" rx="4" stroke="white" strokeWidth="2.5" />
              <circle cx="10" cy="16" r="2" fill="white" />
              <circle cx="14" cy="20" r="2" fill="white" />
              <circle cx="18" cy="24" r="2" fill="white" />
              {/* Second die - showing 6 */}
              <rect x="30" y="24" width="24" height="24" rx="4" fill="white" opacity="0.2" />
              <rect x="30" y="24" width="24" height="24" rx="4" stroke="white" strokeWidth="2.5" />
              <circle cx="36" cy="30" r="2" fill="white" />
              <circle cx="36" cy="36" r="2" fill="white" />
              <circle cx="36" cy="42" r="2" fill="white" />
              <circle cx="48" cy="30" r="2" fill="white" />
              <circle cx="48" cy="36" r="2" fill="white" />
              <circle cx="48" cy="42" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-[13px] font-medium text-foreground mt-1">Create</span>
        </button>

        <Link to="/bets">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "bets" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <TrendingUp size={22} strokeWidth={active === "bets" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Bets</span>
          </button>
        </Link>

        <Link to="/profile">
          <button
            className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 ${
              active === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User size={22} strokeWidth={active === "profile" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
