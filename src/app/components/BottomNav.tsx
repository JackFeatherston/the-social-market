import { Link } from "react-router";

interface BottomNavProps {
  active: "home" | "friends" | "bets" | "profile";
}

export function BottomNav({ active }: BottomNavProps) {
  const navItems = [
    { id: "home", label: "Home", icon: "🏠", path: "/home" },
    { id: "friends", label: "Friends", icon: "👥", path: "/friends" },
    { id: "bets", label: "Bets", icon: "📊", path: "/home" },
    { id: "profile", label: "Profile", icon: "👤", path: "/home" },
  ];

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
      </div>
    </div>
  );
}
