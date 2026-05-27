"use client";

import { useState } from "react";
import { Trophy, Crown } from "lucide-react";
import { useGlobalLeaderboard, useWeeklyLeaderboard, useFriendsLeaderboard, useMyRank } from "@/hooks/useLeaderboard";

type Tab = "global" | "weekly" | "friends";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("global");
  const { data: global, isLoading: gl } = useGlobalLeaderboard();
  const { data: weekly, isLoading: wl } = useWeeklyLeaderboard();
  const { data: friends, isLoading: fl } = useFriendsLeaderboard();
  const { data: myRank } = useMyRank();

  const data = tab === "global" ? global : tab === "weekly" ? weekly : friends;
  const isLoading = tab === "global" ? gl : tab === "weekly" ? wl : fl;
  const myRankNum = tab === "global" ? myRank?.globalRank : tab === "weekly" ? myRank?.weeklyRank : null;

  const rankMedal = (r: number) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        {/* <p className="font-mono text-xs text-green-500 tracking-widest">// GLOBAL ARENA</p> */}
        <h1 className="font-display text-4xl font-bold mt-1 flex items-center gap-3">
          <Trophy className="text-yellow-400" size={32} />
          RANKINGS
        </h1>
      </div>

      {/* My rank banner */}
      {myRankNum && tab !== "friends" && (
        <div className="cb-card p-4 border-green-500/30 animate-fade-up">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground tracking-widest">YOUR POSITION</p>
              <p className="font-display text-2xl font-bold text-green-400 mt-0.5">#{myRankNum}</p>
            </div>
            <Crown size={28} className="text-yellow-400/50" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["global", "weekly", "friends"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`font-mono text-xs tracking-widest px-4 py-2 border transition-all duration-200 ${
              tab === t
                ? "border-green-500/60 text-green-400 bg-green-500/10"
                : "border-border text-muted-foreground hover:border-green-500/30 hover:text-green-400/70"
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="cb-card overflow-hidden animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="font-mono text-xs text-muted-foreground tracking-widest animate-pulse">LOADING DATA...</div>
          </div>
        ) : !data?.entries?.length ? (
          <div className="p-12 text-center font-mono text-xs text-muted-foreground">NO DATA AVAILABLE</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left font-mono text-xs text-muted-foreground tracking-widest">#</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-muted-foreground tracking-widest">OPERATOR</th>
                <th className="px-5 py-3 text-right font-mono text-xs text-muted-foreground tracking-widest">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry, i) => {
                const medal = rankMedal(entry.rank);
                return (
                  <tr key={entry.userId}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:bg-green-500/3 ${i < 3 ? "bg-green-500/2" : ""}`}>
                    <td className="px-5 py-3.5 font-mono text-sm">
                      {medal ? <span className="text-base">{medal}</span> : <span className="text-muted-foreground">{entry.rank}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-display font-semibold text-sm ${i < 3 ? "text-green-400" : "text-foreground"}`}>
                        {entry.username}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm font-bold text-green-400">{entry.score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
