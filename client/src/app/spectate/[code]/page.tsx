"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Eye, Users, ArrowLeft, Activity } from "lucide-react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ProblemDetail } from "@/types";

const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <p className="font-mono text-xs text-muted-foreground animate-pulse">
        LOADING EDITOR...
      </p>
    </div>
  ),
});

interface SpectatorJoinResponse {
  roomId: string; roomCode: string; spectatorCount: number;
  creator: { id: string; username: string; rating: number };
  opponent: { id: string; username: string; rating: number } | null;
  problem: { id: string; title: string; difficulty: string; timeLimit: number; memoryLimit: number } | null;
  startedAt: string | null; duration: number;
}

interface PlayerActivity {
  isRunning: boolean;
  lastStatus: string | null;
  submissionCount: number;
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(startedAt: string | null, durationMin: number) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const end = new Date(startedAt).getTime() + durationMin * 60 * 1000;
    const tick = () => setSecs(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMin]);
  return secs;
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

const DIFF_CLASS: Record<string, string> = {
  EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard",
};

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: "text-green-400", WRONG_ANSWER: "text-red-400",
  TIME_LIMIT_EXCEEDED: "text-yellow-400", COMPILE_ERROR: "text-orange-400",
  RUNTIME_ERROR: "text-red-400", RUNNING: "text-cyan-400 animate-pulse",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function SpectateRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { token, username } = useAuthStore();

  const [roomData, setRoomData] = useState<SpectatorJoinResponse | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [spectators, setSpectators] = useState<string[]>([]);
  const [matchEnded, setMatchEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [creatorActivity, setCreatorActivity] = useState<PlayerActivity>({
    isRunning: false, lastStatus: null, submissionCount: 0,
  });
  const [opponentActivity, setOpponentActivity] = useState<PlayerActivity>({
    isRunning: false, lastStatus: null, submissionCount: 0,
  });

  const clientRef = useRef<Client | null>(null);

  // ── Join spectator session ────────────────────────────────────────────────
  const { mutate: joinSpectate, isPending: joining } = useMutation({
    mutationFn: () =>
      api.post<SpectatorJoinResponse>(`/api/spectate/join/${code}`).then((r) => r.data),
    onSuccess: (data) => {
      setRoomData(data);
      setSpectatorCount(data.spectatorCount);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Cannot spectate this room";
      toast.error(msg);
      router.push("/spectate");
    },
  });

  // ── Leave on unmount ──────────────────────────────────────────────────────
  const { mutate: leaveSpectate } = useMutation({
    mutationFn: () =>
      api.post(`/api/spectate/leave/${roomData?.roomId}`),
  });

  // ── Fetch problem detail ──────────────────────────────────────────────────
  const { data: problem } = useQuery({
    queryKey: ["problem", roomData?.problem?.id],
    queryFn: () =>
      api.get<ProblemDetail>(`/api/problems/${roomData?.problem?.id}`).then((r) => r.data),
    enabled: !!roomData?.problem?.id,
  });

  // ── Countdown ─────────────────────────────────────────────────────────────
  const secondsLeft = useCountdown(
    roomData?.startedAt ?? null,
    roomData?.duration ?? 30
  );

  // ── Join on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    joinSpectate();
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomData?.roomId || !token) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(process.env.NEXT_PUBLIC_WS_URL as string),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        // Subscribe to room events — same topic as players
        client.subscribe(`/topic/room/${roomData.roomId}`, (msg) => {
          const event = JSON.parse(msg.body);
          const { type, payload } = event;

          if (type === "SUBMISSION_RUNNING") {
            const isCreator = payload.userId === roomData.creator.id;
            if (isCreator) {
              setCreatorActivity((p) => ({
                ...p, isRunning: true, lastStatus: null,
              }));
            } else {
              setOpponentActivity((p) => ({
                ...p, isRunning: true, lastStatus: null,
              }));
            }
          }

          if (type === "SUBMISSION_RESULT") {
            const isCreator = payload.userId === roomData.creator.id;
            const update = {
              isRunning: false,
              lastStatus: payload.status,
              submissionCount: 0,
            };
            if (isCreator) {
              setCreatorActivity((p) => ({
                ...update, submissionCount: p.submissionCount + 1,
              }));
            } else {
              setOpponentActivity((p) => ({
                ...update, submissionCount: p.submissionCount + 1,
              }));
            }
            if (payload.status === "ACCEPTED") {
              toast.success(`${payload.username} solved it! 🏆`);
            }
          }

          if (type === "MATCH_ENDED") {
            setMatchEnded(true);
            setWinner(payload.winnerUsername);
          }

          if (type === "SPECTATOR_JOINED") {
            setSpectatorCount(payload.count);
            setSpectators((prev) => [...new Set([...prev, payload.username])]);
          }

          if (type === "SPECTATOR_LEFT") {
            setSpectatorCount(payload.count);
            setSpectators((prev) => prev.filter((s) => s !== payload.username));
          }
        });
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      // Leave spectator session
      if (roomData?.roomId) leaveSpectate();
    };
  }, [roomData?.roomId, token]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (joining || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Eye size={36} className="text-green-400 mx-auto animate-pulse" />
          <p className="font-mono text-xs text-muted-foreground tracking-widest animate-pulse">
            JOINING SPECTATOR VIEW...
          </p>
        </div>
      </div>
    );
  }

  const timerColor = secondsLeft !== null && secondsLeft < 120
    ? "text-red-400 animate-pulse"
    : secondsLeft !== null && secondsLeft < 300
    ? "text-yellow-400" : "text-green-400";

  // ── Match ended overlay ───────────────────────────────────────────────────
  if (matchEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />
        </div>
        <div className="cb-card corner-tl p-10 text-center w-full max-w-sm relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="font-display text-3xl font-bold text-green-400 tracking-wider mb-2">
            BATTLE OVER
          </h2>
          <p className="font-mono text-sm text-foreground mb-1">
            <span className="text-green-400 font-bold">{winner}</span> won the battle!
          </p>
          <p className="font-mono text-xs text-muted-foreground mb-8">
            Thanks for watching
          </p>
          <Link href="/spectate" className="btn-primary w-full block text-center">
            WATCH MORE BATTLES →
          </Link>
        </div>
      </div>
    );
  }

  // ── Main spectator view ───────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 h-11 border-b shrink-0 bg-card/80"
        style={{ borderBottomColor: "rgba(34,197,94,0.15)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/spectate"
            className="text-muted-foreground hover:text-green-400 transition-colors">
            <ArrowLeft size={14} />
          </Link>

          {/* Spectator badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-cyan-500/30 bg-cyan-500/5">
            <Eye size={10} className="text-cyan-400" />
            <span className="font-mono text-xs text-cyan-400 tracking-widest">SPECTATING</span>
          </div>

          {roomData.problem && (
            <>
              <span className="font-display font-semibold text-sm truncate hidden sm:block">
                {roomData.problem.title}
              </span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                DIFF_CLASS[roomData.problem.difficulty] ?? "badge-easy"}`}>
                {roomData.problem.difficulty}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
          {/* Timer */}
          {secondsLeft !== null && (
            <span className={`font-bold tracking-widest ${timerColor}`}>
              ⏱ {fmt(secondsLeft)}
            </span>
          )}

          {/* Spectator count */}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users size={11} />
            {spectatorCount} watching
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div
          className="w-[38%] border-r overflow-y-auto p-5 space-y-4 shrink-0"
          style={{ borderRightColor: "rgba(34,197,94,0.1)" }}
        >
          {problem ? (
            <>
              <div>
                <h2 className="font-display text-xl font-bold">{problem.title}</h2>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  TIME: {problem.timeLimit}ms · MEM: {problem.memoryLimit}MB
                </p>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {problem.description}
              </p>
              {problem.inputFormat && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">INPUT FORMAT</p>
                  <p className="text-sm">{problem.inputFormat}</p>
                </div>
              )}
              {problem.outputFormat && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">OUTPUT FORMAT</p>
                  <p className="text-sm">{problem.outputFormat}</p>
                </div>
              )}
              {problem.constraints && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">CONSTRAINTS</p>
                  <pre className="font-mono text-xs bg-muted/30 border border-border p-3 whitespace-pre-wrap">
                    {problem.constraints}
                  </pre>
                </div>
              )}
              {problem.sampleTestCases?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-green-500 tracking-widest">EXAMPLES</p>
                  {problem.sampleTestCases.map((tc, i) => (
                    <div key={tc.id} className="border border-border overflow-hidden">
                      <div className="px-3 py-1.5 bg-muted/30 font-mono text-xs text-muted-foreground">
                        EXAMPLE {i + 1}
                      </div>
                      <div className="px-3 py-2 space-y-1 font-mono text-xs">
                        <div><span className="text-muted-foreground">IN:  </span>{tc.input}</div>
                        <div>
                          <span className="text-muted-foreground">OUT: </span>
                          <span className="text-green-400">{tc.expectedOutput}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 animate-pulse">
              {[60, 80, 40, 90, 50].map((w, i) => (
                <div key={i} className="h-3 bg-muted/50 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {/* Spectator list */}
          {spectators.length > 0 && (
            <div className="mt-6">
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">
                // ALSO WATCHING
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spectators.map((s) => (
                  <span key={s}
                    className="font-mono text-xs px-2 py-0.5 border border-border text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player activity panels */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player status bar */}
          <div
            className="grid grid-cols-2 border-b shrink-0"
            style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}
          >
            {/* Creator */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-r"
              style={{ borderRightColor: "rgba(34,197,94,0.1)" }}
            >
              <div className="w-8 h-8 border border-green-500/40 flex items-center justify-center font-mono text-xs font-bold text-green-400">
                {roomData.creator.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm">
                    {roomData.creator.username}
                  </span>
                  <span className="font-mono text-xs text-green-400">
                    ⚡{roomData.creator.rating}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {creatorActivity.isRunning && (
                    <span className="flex items-center gap-1 font-mono text-xs text-cyan-400 animate-pulse">
                      <Activity size={9} /> RUNNING...
                    </span>
                  )}
                  {creatorActivity.lastStatus && !creatorActivity.isRunning && (
                    <span className={`font-mono text-xs ${STATUS_COLOR[creatorActivity.lastStatus] ?? "text-muted-foreground"}`}>
                      {creatorActivity.lastStatus.replace(/_/g, " ")}
                    </span>
                  )}
                  {creatorActivity.submissionCount > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {creatorActivity.submissionCount} attempt{creatorActivity.submissionCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 border border-red-500/30 flex items-center justify-center font-mono text-xs font-bold text-red-400">
                {roomData.opponent?.username[0].toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm">
                    {roomData.opponent?.username ?? "Unknown"}
                  </span>
                  <span className="font-mono text-xs text-red-400">
                    ⚡{roomData.opponent?.rating ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {opponentActivity.isRunning && (
                    <span className="flex items-center gap-1 font-mono text-xs text-cyan-400 animate-pulse">
                      <Activity size={9} /> RUNNING...
                    </span>
                  )}
                  {opponentActivity.lastStatus && !opponentActivity.isRunning && (
                    <span className={`font-mono text-xs ${STATUS_COLOR[opponentActivity.lastStatus] ?? "text-muted-foreground"}`}>
                      {opponentActivity.lastStatus.replace(/_/g, " ")}
                    </span>
                  )}
                  {opponentActivity.submissionCount > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {opponentActivity.submissionCount} attempt{opponentActivity.submissionCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Read-only editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-card/50"
              style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}
            >
              <span className="font-mono text-xs text-muted-foreground tracking-widest">
                // SPECTATOR VIEW — READ ONLY
              </span>
              <span className="font-mono text-xs text-cyan-400/60">
                Players&apos; code is private
              </span>
            </div>

            {/* Centered message instead of editor (code is private) */}
            <div className="flex-1 flex items-center justify-center bg-[#0a0f0d]">
              <div className="text-center space-y-4">
                <Eye size={48} className="text-green-400/20 mx-auto" />
                <div>
                  <p className="font-mono text-sm text-muted-foreground tracking-widest">
                    WATCHING THE BATTLE
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/50 mt-2">
                    Players&apos; code is private — follow their submission activity above
                  </p>
                </div>

                {/* Live activity feed */}
                <div className="mt-6 space-y-2 max-w-xs mx-auto text-left">
                  {creatorActivity.lastStatus && (
                    <div className="flex items-center gap-2 px-3 py-2 border border-border bg-card">
                      <div className="w-5 h-5 border border-green-500/30 flex items-center justify-center font-mono text-xs text-green-400">
                        {roomData.creator.username[0].toUpperCase()}
                      </div>
                      <span className={`font-mono text-xs ${STATUS_COLOR[creatorActivity.lastStatus]}`}>
                        {creatorActivity.lastStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {opponentActivity.lastStatus && (
                    <div className="flex items-center gap-2 px-3 py-2 border border-border bg-card">
                      <div className="w-5 h-5 border border-red-500/20 flex items-center justify-center font-mono text-xs text-red-400">
                        {roomData.opponent?.username[0].toUpperCase() ?? "?"}
                      </div>
                      <span className={`font-mono text-xs ${STATUS_COLOR[opponentActivity.lastStatus]}`}>
                        {opponentActivity.lastStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {!creatorActivity.lastStatus && !opponentActivity.lastStatus && (
                    <p className="font-mono text-xs text-muted-foreground/30 text-center animate-pulse">
                      Waiting for first submission...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
