"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Swords, Flame, Zap, Shield } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useMyRank } from "@/hooks/useLeaderboard";
import { UserProfile, AchievementsListResponse } from "@/types";

export default function ProfilePage() {
  const { userId } = useAuthStore();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<UserProfile>("/api/users/me").then((r) => r.data),
    enabled: !!userId,
  });
  const { data: rank } = useMyRank();
  const { data: achievements } = useQuery({
    queryKey: ["achievements", "my"],
    queryFn: () => api.get<AchievementsListResponse>("/api/achievements/my").then((r) => r.data),
  });

  const winRate = profile && profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) : 0;

  if (isLoading) return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <div className="font-mono text-xs text-green-500 animate-pulse tracking-widest">LOADING OPERATOR DATA...</div>
    </div>
  );
  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <p className="font-mono text-xs text-green-500 tracking-widest animate-fade-up">// OPERATOR PROFILE</p>

      {/* Profile header */}
      <div className="cb-card corner-tl p-6 relative animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 border-2 border-green-500/40 rotate-45" />
            <div className="absolute inset-2 border border-green-500/20 rotate-45" />
            <Shield size={28} className="text-green-400 relative z-10" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-green-400">{profile.username}</h1>
            <p className="font-mono text-xs text-muted-foreground mt-1">{profile.email}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="font-mono text-xs border border-green-500/30 px-2 py-1 text-green-400">⚡ {profile.rating} ELO</span>
              <span className="font-mono text-xs text-muted-foreground">{profile.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 animate-fade-up">
        {[
          { label: "WINS",       value: profile.wins,    color: "text-green-400" },
          { label: "LOSSES",     value: profile.losses,  color: "text-red-400" },
          { label: "WIN RATE",   value: `${winRate}%`,   color: "text-cyan-400" },
          { label: "STREAK",     value: `${profile.streak}🔥`, color: "text-orange-400" },
          { label: "XP",         value: profile.xp,      color: "text-yellow-400" },
          { label: "GLOBAL",     value: rank?.globalRank ? `#${rank.globalRank}` : "—", color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="cb-card p-4 text-center">
            <p className="font-mono text-xs text-muted-foreground tracking-wider mb-2">{label}</p>
            <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements && achievements.unlocked.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted-foreground tracking-widest">// ACHIEVEMENTS</p>
            <p className="font-mono text-xs text-green-500">{achievements.unlocked.length} UNLOCKED · {achievements.totalXpFromAchievements} XP</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.unlocked.map((a) => (
              <div key={a.id} className="cb-card p-4 flex items-start gap-3 hover:border-green-500/30 transition-all">
                <div className="text-2xl shrink-0">🏅</div>
                <div>
                  <p className="font-display font-semibold text-sm">{a.title}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  <p className="font-mono text-xs text-green-500 mt-1">+{a.xpReward} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
