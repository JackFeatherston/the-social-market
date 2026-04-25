import { Link, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

interface BottomNavProps {
  active: "home" | "friends" | "bets" | "profile";
}

export function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: "home", label: "Home", icon: "🏠", path: "/home" },
    { id: "friends", label: "Friends", icon: "👥", path: "/friends" },
    { id: "bets", label: "Bets", icon: "📊", path: "/home" },
    { id: "profile", label: "Profile", icon: "👤", path: "/home" },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link key={item.id} to={item.path}>
            <button
              className={`flex flex-col items-center gap-1 transition-colors ${
                active === item.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
        >
          <span className="text-xl">🚪</span>
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
