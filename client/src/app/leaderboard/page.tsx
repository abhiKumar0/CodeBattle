"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import {
  useGlobalLeaderboard,
  useWeeklyLeaderboard,
  useMyRank,
} from "@/hooks/useLeaderboard";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "weekly">("global");
  const { data: global, isLoading: gl } = useGlobalLeaderboard();
  const { data: weekly, isLoading: wl } = useWeeklyLeaderboard();
  const { data: myRank } = useMyRank();

  const data = tab === "global" ? global : weekly;
  const isLoading = tab === "global" ? gl : wl;
  const myRankNum = tab === "global" ? myRank?.globalRank : myRank?.weeklyRank;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* My rank */}
      {myRankNum && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          Your rank: <span className="font-bold text-primary">#{myRankNum}</span>
          {" · "}
          Score:{" "}
          <span className="font-bold">
            {tab === "global" ? myRank?.globalScore : myRank?.weeklyScore}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["global", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Player</th>
                <th className="px-4 py-3 text-right font-medium">
                  {tab === "global" ? "Rating" : "Wins"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-muted-foreground">
                    {entry.rank <= 3 ? (
                      <span>{["🥇", "🥈", "🥉"][entry.rank - 1]}</span>
                    ) : (
                      entry.rank
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.username}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
