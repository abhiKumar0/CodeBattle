"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Swords, Trophy, Flame, BookOpen, Users, TrendingUp, Zap } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useMyRank } from "@/hooks/useLeaderboard";
import { ProblemDetail, UserProfile } from "@/types";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string; }) {
  return (
    <div className="cb-card p-5 animate-fade-up">
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-widest mb-3 px-2 py-1 rounded border ${color}`}>
        <Icon size={11} /><span className="uppercase">{label}</span>
      </div>
      <div className="font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { username, userId } = useAuthStore();
  const { data: rank } = useMyRank();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<UserProfile>("/api/users/me").then((r) => r.data),
    enabled: !!userId,
  });
  const { data: daily } = useQuery({
    queryKey: ["problems", "daily"],
    queryFn: () => api.get<ProblemDetail>("/api/problems/daily").then((r) => r.data),
  });

  const winRate = profile && profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) : 0;

  const diffClass: Record<string, string> = { EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard" };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <p className="font-mono text-xs text-green-500 tracking-widest"> WELCOME BACK</p>
        <h1 className="font-display text-4xl font-bold mt-1">
          <span className="text-green-400">{username}</span>
          <span className="text-muted-foreground text-2xl ml-2 font-mono animate-blink">_</span>
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1 tracking-wider">
          RATING: <span className="text-green-400">{profile?.rating ?? 1200}</span>
          {" · "}GLOBAL: <span className="text-cyan-400">#{rank?.globalRank ?? "—"}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Rating"   value={profile?.rating ?? 1200}        icon={Zap}       color="text-green-400 border-green-500/20 bg-green-500/5" />
        <StatCard label="Wins"     value={profile?.wins ?? 0}             icon={Trophy}    color="text-cyan-400 border-cyan-500/20 bg-cyan-500/5" />
        <StatCard label="Win Rate" value={`${winRate}%`}                  icon={TrendingUp} color="text-yellow-400 border-yellow-500/20 bg-yellow-500/5" />
        <StatCard label="Streak"   value={`${profile?.streak ?? 0} 🔥`}  icon={Flame}     color="text-red-400 border-red-500/20 bg-red-500/5" />
      </div>

      {/* Daily challenge */}
      {daily && (
        <div className="cb-card corner-tl p-6 animate-fade-up relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-xs text-green-500 tracking-widest mb-2">// DAILY CHALLENGE</p>
              <h2 className="font-display text-xl font-bold">{daily.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`font-mono text-xs px-2 py-0.5 rounded ${diffClass[daily.difficulty] ?? "badge-easy"}`}>
                  {daily.difficulty}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{daily.topic}</span>
              </div>
            </div>
            <Link href={`/problems/${daily.id}`} className="btn-primary shrink-0">SOLVE NOW →</Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mb-4">// QUICK ACTIONS</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/match/random", icon: Swords,  title: "QUICK BATTLE", desc: "Find opponent" },
            { href: "/problems",     icon: BookOpen, title: "PROBLEMS",     desc: "Browse arena"  },
            { href: "/leaderboard",  icon: Trophy,   title: "RANKINGS",     desc: "Global boards" },
            { href: "/friends",      icon: Users,    title: "ALLIES",       desc: "Your network"  },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} className="cb-card p-5 group hover:border-green-500/40 transition-all duration-300">
              <div className="mb-4">
                <Icon size={20} className="text-green-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="font-mono text-xs font-bold tracking-wider">{title}</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Rank summary */}
      {rank && (
        <div className="cb-card p-5 animate-fade-up">
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-4">// PERFORMANCE INDEX</p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">GLOBAL RANK</p>
              <p className="font-display text-2xl font-bold text-green-400">{rank.globalRank ? `#${rank.globalRank}` : "UNRANKED"}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">WEEKLY RANK</p>
              <p className="font-display text-2xl font-bold text-cyan-400">{rank.weeklyRank ? `#${rank.weeklyRank}` : "UNRANKED"}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">TOTAL XP</p>
              <p className="font-display text-2xl font-bold text-yellow-400">{profile?.xp ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
