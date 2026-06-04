"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Eye, Users, Clock, Zap } from "lucide-react";
import api from "@/lib/api";

interface ActiveRoom {
  roomId: string; roomCode: string;
  creatorUsername: string; creatorRating: number;
  opponentUsername: string; opponentRating: number;
  problemTitle: string; difficulty: string;
  startedAt: string; duration: number;
  spectatorCount: number;
}

function elapsed(startedAt: string): string {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DIFF_CLASS: Record<string, string> = {
  EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard",
};

export default function SpectatePage() {
  const router = useRouter();

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ["spectate", "rooms"],
    queryFn: () =>
      api.get<ActiveRoom[]>("/api/spectate/rooms").then((r) => r.data),
    refetchInterval: 10000, // auto-refresh every 10s
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        {/* <p className="font-mono text-xs text-green-500 tracking-widest">// LIVE ARENA</p> */}
        <div className="flex items-center justify-between mt-1">
          <h1 className="font-display text-4xl font-bold flex items-center gap-3">
            <Eye className="text-green-400" size={30} />
            SPECTATE
          </h1>
          <button
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            ↻ REFRESH
          </button>
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {rooms.length} LIVE BATTLE{rooms.length !== 1 ? "S" : ""} IN PROGRESS
        </p>
      </div>

      {/* Rooms list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cb-card p-5 animate-pulse">
              <div className="h-4 bg-muted/50 rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="cb-card p-16 text-center">
          <Eye size={36} className="text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            NO LIVE BATTLES RIGHT NOW
          </p>
          <p className="font-mono text-xs text-muted-foreground/50 mt-2">
            Check back soon or start a battle yourself
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.roomId}
              className="cb-card corner-tl p-5 hover:border-green-500/40 transition-all duration-200 cursor-pointer group"
              onClick={() => router.push(`/spectate/${room.roomCode}`)}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Players */}
                <div className="flex items-center gap-3">
                  {/* Creator */}
                  <div className="text-center">
                    <div className="w-9 h-9 border border-green-500/40 flex items-center justify-center font-mono text-xs font-bold text-green-400 mb-1">
                      {room.creatorUsername[0].toUpperCase()}
                    </div>
                    <p className="font-display font-semibold text-xs">
                      {room.creatorUsername}
                    </p>
                    <p className="font-mono text-xs text-green-400">⚡{room.creatorRating}</p>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-xs text-muted-foreground">VS</span>
                    <div className="w-px h-8 bg-border" />
                  </div>

                  {/* Opponent */}
                  <div className="text-center">
                    <div className="w-9 h-9 border border-red-500/30 flex items-center justify-center font-mono text-xs font-bold text-red-400 mb-1">
                      {room.opponentUsername[0].toUpperCase()}
                    </div>
                    <p className="font-display font-semibold text-xs">
                      {room.opponentUsername}
                    </p>
                    <p className="font-mono text-xs text-red-400">⚡{room.opponentRating}</p>
                  </div>
                </div>

                {/* Problem + meta */}
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded ${DIFF_CLASS[room.difficulty] ?? "badge-easy"}`}>
                      {room.difficulty}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      #{room.roomCode}
                    </span>
                  </div>
                  <p className="font-display font-semibold text-sm mb-1">
                    {room.problemTitle}
                  </p>
                  <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {elapsed(room.startedAt)} elapsed
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {room.spectatorCount} watching
                    </span>
                  </div>
                </div>

                {/* Watch button */}
                <button className="btn-primary flex items-center gap-2 px-4 py-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye size={12} /> WATCH
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info
      <div className="cb-card p-4">
        <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">
          // HOW SPECTATING WORKS
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-start gap-2">
            <Eye size={12} className="text-green-400 mt-0.5 shrink-0" />
            <span>Watch live battles in read-only mode — see the problem and player activity</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap size={12} className="text-yellow-400 mt-0.5 shrink-0" />
            <span>See submission results in realtime as players submit their code</span>
          </div>
          <div className="flex items-start gap-2">
            <Users size={12} className="text-cyan-400 mt-0.5 shrink-0" />
            <span>Other spectators are visible — see who else is watching the battle</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
