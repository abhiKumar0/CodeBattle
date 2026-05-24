"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Swords, Trophy, Flame, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useMyRank } from "@/hooks/useLeaderboard";
import { ProblemDetail, UserProfile } from "@/types";
import { difficultyBg } from "@/lib/utils";

export default function DashboardPage() {
  const { username, userId } = useAuthStore();
  const { data: rank } = useMyRank();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () =>
      api.get<UserProfile>(`/api/users/me`).then((r) => r.data),
    enabled: !!userId,
  });

  const { data: daily } = useQuery({
    queryKey: ["problems", "daily"],
    queryFn: () =>
      api.get<ProblemDetail>("/api/problems/daily").then((r) => r.data),
  });

  const winRate =
    profile && profile.wins + profile.losses > 0
      ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {username} 👋</h1>
        <p className="text-muted-foreground mt-1">Ready to battle?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rating", value: profile?.rating ?? 1200, icon: Star },
          { label: "Wins", value: profile?.wins ?? 0, icon: Trophy },
          { label: "Win Rate", value: `${winRate}%`, icon: Swords },
          { label: "Streak", value: `${profile?.streak ?? 0} 🔥`, icon: Flame },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Icon size={14} />
              {label}
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Rank */}
      {rank && (
        <div className="rounded-xl border border-border bg-card p-4 flex gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Global Rank</p>
            <p className="text-2xl font-bold">#{rank.globalRank ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Weekly Rank</p>
            <p className="text-2xl font-bold">#{rank.weeklyRank ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">XP</p>
            <p className="text-2xl font-bold">{profile?.xp ?? 0}</p>
          </div>
        </div>
      )}

      {/* Daily Problem */}
      {daily && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-sm font-medium text-primary mb-2">🧩 Daily Problem</p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{daily.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${difficultyBg(daily.difficulty)}`}>
                {daily.difficulty}
              </span>
            </div>
            <Link
              href={`/problems/${daily.id}`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Solve
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/match/random"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors group"
        >
          <Swords className="mb-3 text-primary" size={24} />
          <h3 className="font-semibold">Quick Match</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Find a random opponent and battle
          </p>
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors group"
        >
          <Trophy className="mb-3 text-primary" size={24} />
          <h3 className="font-semibold">Leaderboard</h3>
          <p className="text-sm text-muted-foreground mt-1">
            See where you rank globally
          </p>
        </Link>
      </div>
    </div>
  );
}
