"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Swords, Trophy, XCircle, Minus, ChevronDown, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { BattleHistoryEntry, PaginatedResponse } from "@/types";

const RESULT_CONFIG = {
  WIN:  { icon: Trophy,  color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "VICTORY" },
  LOSS: { icon: XCircle,  color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20",   label: "DEFEAT" },
  DRAW: { icon: Minus,    color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "DRAW" },
};

const DIFFICULTY_BADGE: Record<string, string> = {
  EASY: "badge-easy",
  MEDIUM: "badge-medium",
  HARD: "badge-hard",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BattleHistoryList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["battleHistory"],
    queryFn: ({ pageParam = 0 }) =>
      api.get<PaginatedResponse<BattleHistoryEntry>>(`/api/users/me/history?page=${pageParam}&size=10`)
        .then((r) => r.data),
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
  });

  const battles = data?.pages.flatMap((p) => p.content) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cb-card p-4 h-20 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-green-500/10 rounded w-1/3" />
                <div className="h-2 bg-green-500/5 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="cb-card p-8 text-center">
        <Swords size={40} className="text-green-500/20 mx-auto mb-3" />
        <p className="font-display text-lg text-muted-foreground">No battles yet</p>
        <p className="font-mono text-xs text-muted-foreground/60 mt-1">
          Enter the arena to build your history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {battles.map((battle, i) => {
        const cfg = RESULT_CONFIG[battle.result];
        const Icon = cfg.icon;

        return (
          <div
            key={`${battle.roomId}-${i}`}
            className={`cb-card p-4 flex items-center gap-4 hover:border-green-500/30 transition-all animate-fade-up`}
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            {/* Result icon */}
            <div className={`w-10 h-10 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={cfg.color} />
            </div>

            {/* Battle info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                <span className="font-mono text-xs text-muted-foreground">vs</span>
                <span className="font-display text-sm font-semibold text-foreground truncate">
                  {battle.opponentUsername}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${DIFFICULTY_BADGE[battle.problemDifficulty] || "badge-easy"}`}>
                  {battle.problemDifficulty}
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {battle.problemTitle}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="text-right shrink-0">
              <p className="font-mono text-xs text-muted-foreground">
                {battle.endedAt ? formatDate(battle.endedAt) : "—"}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
                {battle.durationMinutes}m
              </p>
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
        >
          {isFetchingNextPage ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ChevronDown size={14} />
          )}
          {isFetchingNextPage ? "LOADING..." : "LOAD MORE"}
        </button>
      )}
    </div>
  );
}
