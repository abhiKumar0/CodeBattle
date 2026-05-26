"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, Trophy, LayoutDashboard, LogOut, Users, BookOpen, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/match/random", label: "Battle",      icon: Swords },
  { href: "/problems",     label: "Problems",    icon: BookOpen },
  { href: "/leaderboard",  label: "Rankings",    icon: Trophy },
  { href: "/friends",      label: "Friends",     icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const { username, rating } = useAuthStore();
  const logout = useLogout();

  return (
    <nav className="sticky top-0 z-50 h-12 border-b border-border bg-card/90 backdrop-blur-sm flex items-center px-4 gap-4"
      style={{ borderBottomColor: "rgba(34,197,94,0.15)" }}>
      
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-4 shrink-0 group">
        <div className="relative w-7 h-7 flex items-center justify-center">
          <div className="absolute inset-0 border border-green-500/40 rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
          <Swords size={13} className="text-green-500 relative z-10" />
        </div>
        <span className="font-mono text-sm font-bold text-green-500 tracking-widest hidden sm:block">CODEBATTLE</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5 flex-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium tracking-wider transition-all duration-200 border-b-2 ${
                active
                  ? "text-green-400 border-green-500"
                  : "text-muted-foreground border-transparent hover:text-green-400/70 hover:border-green-500/30"
              }`}>
              <Icon size={12} />
              <span className="hidden md:inline uppercase">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs border border-green-500/20 rounded px-2.5 py-1 bg-green-500/5">
          <span className="text-muted-foreground">{username}</span>
          <span className="text-green-400 font-bold">⚡{rating}</span>
        </div>
        <Link href="/profile" className="p-1.5 text-muted-foreground hover:text-green-400 transition-colors">
          <User size={14} />
        </Link>
        <button onClick={logout} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors" title="Logout">
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}
