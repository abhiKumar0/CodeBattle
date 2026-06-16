"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Eye, Users, ArrowLeft, Activity, Code } from "lucide-react";
import toast from "react-hot-toast";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "@/lib/api";
import { connectStomp, subscribeToRoom } from "@/lib/ws";
import { useAuthStore } from "@/store/authStore";
import { ProblemDetail, Language } from "@/types";

const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <p className="font-mono text-xs text-muted-foreground animate-pulse">LOADING EDITOR...</p>
    </div>
  ),
});

interface SpectatorJoinResponse {
  roomId: string; roomCode: string; spectatorCount: number;
  spectators?: { username: string; initial: string }[];
  creator: { id: string; username: string; rating: number };
  opponent: { id: string; username: string; rating: number } | null;
  problem: { id: string; title: string; difficulty: string; timeLimit: number; memoryLimit: number } | null;
  startedAt: string | null; duration: number;
}

interface PlayerState {
  isRunning: boolean;
  lastStatus: string | null;
  submissionCount: number;
  code: string;
  language: Language;
}

function useCountdown(startedAt: string | null, durationMin: number) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const parsed = new Date(startedAt).getTime();
    if (isNaN(parsed)) return;
    const end = parsed + durationMin * 60 * 1000;
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
const LANG_LABELS: Record<string, string> = {
  java: "Java", python: "Python 3", cpp: "C++", javascript: "JavaScript", c: "C",
};

const EMPTY_STATE: PlayerState = {
  isRunning: false, lastStatus: null, submissionCount: 0, code: "", language: "java",
};

export default function SpectateRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  const [roomData, setRoomData] = useState<SpectatorJoinResponse | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [spectators, setSpectators] = useState<{ username: string; initial: string }[]>([]);
  const [matchEnded, setMatchEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<"creator" | "opponent">("creator");
  const [creatorState, setCreatorState] = useState<PlayerState>(EMPTY_STATE);
  const [opponentState, setOpponentState] = useState<PlayerState>(EMPTY_STATE);

  const spectateClientRef = useRef<Client | null>(null);

  // ── Join ─────────────────────────────────────────────────────────────────
  const { mutate: joinSpectate, isPending: joining } = useMutation({
    mutationFn: () =>
      api.post<SpectatorJoinResponse>(`/api/spectate/join/${code}`).then((r) => r.data),
    onSuccess: (data) => {
      setRoomData(data);
      setSpectatorCount(data.spectatorCount);
      if (data.spectators) setSpectators(data.spectators);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Cannot spectate this room");
      router.push("/spectate");
    },
  });

  const { mutate: leaveSpectate } = useMutation({
    mutationFn: () => api.post(`/api/spectate/leave/${roomData?.roomId}`),
  });

  const { data: problem } = useQuery({
    queryKey: ["problem", roomData?.problem?.id],
    queryFn: () =>
      api.get<ProblemDetail>(`/api/problems/${roomData?.problem?.id}`).then((r) => r.data),
    enabled: !!roomData?.problem?.id,
  });

  const secondsLeft = useCountdown(roomData?.startedAt ?? null, roomData?.duration ?? 30);

  useEffect(() => { joinSpectate(); }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !matchEnded) {
      setMatchEnded(true);
      setWinner(null);
    }
  }, [secondsLeft, matchEnded]);

  // ── WebSocket — room events (submissions, match end, spectator join/leave)
  useEffect(() => {
    if (!roomData?.roomId || !token) return;
    let roomSub: any = null;

    connectStomp(token).then(() => {
      roomSub = subscribeToRoom(roomData.roomId, (event: any) => {
        const { type, payload } = event;

        if (type === "SUBMISSION_RUNNING") {
          const isCreator = payload.userId === roomData.creator.id;
          if (isCreator) setCreatorState((p) => ({ ...p, isRunning: true, lastStatus: null }));
          else setOpponentState((p) => ({ ...p, isRunning: true, lastStatus: null }));
        }

        if (type === "SUBMISSION_RESULT") {
          const isCreator = payload.userId === roomData.creator.id;
          const setter = isCreator ? setCreatorState : setOpponentState;
          setter((p) => ({
            ...p, isRunning: false,
            lastStatus: payload.status,
            submissionCount: p.submissionCount + 1,
          }));
          if (payload.status === "ACCEPTED") toast.success(`🏆 ${payload.username} solved it!`);
          // Auto-switch to who just submitted
          setViewingPlayer(isCreator ? "creator" : "opponent");
        }

        if (type === "MATCH_ENDED") {
          setMatchEnded(true);
          setWinner(payload.winnerUsername || null);
        }

        if (type === "SPECTATOR_JOINED") {
          setSpectatorCount(payload.count);
          if (payload.spectators) setSpectators(payload.spectators);
        }
        if (type === "SPECTATOR_LEFT") {
          setSpectatorCount(payload.count);
          if (payload.spectators) setSpectators(payload.spectators);
        }
      });
    });

    return () => {
      roomSub?.unsubscribe();
      if (roomData?.roomId) leaveSpectate();
    };
  }, [roomData?.roomId, token]);

  // ── WebSocket — spectate topic (realtime code updates from players typing)
  useEffect(() => {
    if (!roomData?.roomId || !token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL as string),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/spectate/${roomData.roomId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.type === "CODE_UPDATE") {
              const isCreator = data.userId === roomData.creator.id;
              const setter = isCreator ? setCreatorState : setOpponentState;
              setter((p) => ({
                ...p,
                code: data.code,
                language: (data.language as Language) ?? p.language,
              }));
              // Auto-switch to active player
              setViewingPlayer(isCreator ? "creator" : "opponent");
            }
          } catch (e) {
            console.error("Spectate code parse error:", e);
          }
        });
      },
    });

    spectateClientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      spectateClientRef.current = null;
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
    : secondsLeft !== null && secondsLeft < 300 ? "text-yellow-400" : "text-green-400";

  // ── Match ended ───────────────────────────────────────────────────────────
  if (matchEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />
        </div>
        <div className="cb-card corner-tl p-10 text-center w-full max-w-sm relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="text-6xl mb-4">{winner ? "🏆" : "⏰"}</div>
          <h2 className="font-display text-3xl font-bold text-green-400 tracking-wider mb-2">
            {winner ? "BATTLE OVER" : "TIME'S UP"}
          </h2>
          <p className="font-mono text-sm mb-1">
            {winner
              ? <><span className="text-green-400 font-bold">{winner}</span> won!</>
              : <span className="text-yellow-400">Neither player solved it in time</span>
            }
          </p>
          <p className="font-mono text-xs text-muted-foreground mb-8">Thanks for watching</p>
          <Link href="/spectate" className="btn-primary w-full block text-center">
            WATCH MORE BATTLES →
          </Link>
        </div>
      </div>
    );
  }

  const currentState  = viewingPlayer === "creator" ? creatorState : opponentState;
  const currentPlayer = viewingPlayer === "creator" ? roomData.creator : roomData.opponent;

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0 bg-card/80"
        style={{ borderBottomColor: "rgba(34,197,94,0.15)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/spectate" className="text-muted-foreground hover:text-green-400 transition-colors">
            <ArrowLeft size={14} />
          </Link>
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-cyan-500/30 bg-cyan-500/5">
            <Eye size={10} className="text-cyan-400" />
            <span className="font-mono text-xs text-cyan-400 tracking-widest">SPECTATING</span>
          </div>
          {roomData.problem && (
            <>
              <span className="font-display font-semibold text-sm truncate hidden sm:block">
                {roomData.problem.title}
              </span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${DIFF_CLASS[roomData.problem.difficulty] ?? "badge-easy"}`}>
                {roomData.problem.difficulty}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
          {secondsLeft !== null && (
            <span className={`font-bold tracking-widest ${timerColor}`}>⏱ {fmt(secondsLeft)}</span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users size={11} /> {spectatorCount} watching
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-[35%] border-r overflow-y-auto p-4 space-y-4 shrink-0"
          style={{ borderRightColor: "rgba(34,197,94,0.1)" }}>
          {problem ? (
            <>
              <div>
                <h2 className="font-display text-lg font-bold">{problem.title}</h2>
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
                  <p className="text-sm whitespace-pre-wrap">{problem.inputFormat}</p>
                </div>
              )}
              {problem.outputFormat && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">OUTPUT FORMAT</p>
                  <p className="text-sm whitespace-pre-wrap">{problem.outputFormat}</p>
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
                      <div className="px-3 py-2 font-mono text-xs">
                        <div className="mb-1">
                          <span className="text-muted-foreground">INPUT:</span>
                          <pre className="text-foreground whitespace-pre-wrap mt-0.5">{tc.input}</pre>
                        </div>
                        <div>
                          <span className="text-muted-foreground">OUTPUT:</span>
                          <pre className="text-green-400 whitespace-pre-wrap mt-0.5">{tc.expectedOutput}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 animate-pulse">
              {[60, 80, 40, 90].map((w, i) => (
                <div key={i} className="h-3 bg-muted/50 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {/* Spectators list */}
          {spectators.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">
                // WATCHING ({spectators.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spectators.map((s) => (
                  <div key={s.username}
                    className="flex items-center gap-1.5 px-2 py-1 border border-border bg-muted/20">
                    <div className="w-4 h-4 bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-mono text-cyan-400"
                      style={{ fontSize: "9px" }}>
                      {s.initial}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{s.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Code panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player tabs */}
          <div className="border-b shrink-0 bg-card/50 flex"
            style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}>

            {/* Creator tab */}
            <button
              onClick={() => setViewingPlayer("creator")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                viewingPlayer === "creator"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <div className="w-6 h-6 border border-green-500/40 flex items-center justify-center font-mono text-xs text-green-400">
                {roomData.creator.username[0].toUpperCase()}
              </div>
              <div className="text-left">
                <p className="font-display font-semibold text-xs">{roomData.creator.username}</p>
                <p className="font-mono text-xs opacity-60">⚡{roomData.creator.rating}</p>
              </div>
              {creatorState.isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1" />
              )}
              {creatorState.lastStatus && !creatorState.isRunning && (
                <span className={`font-mono text-xs ml-1 ${STATUS_COLOR[creatorState.lastStatus] ?? ""}`}>
                  {creatorState.lastStatus === "ACCEPTED" ? "✓" : "✗"}
                </span>
              )}
            </button>

            {/* Opponent tab */}
            {roomData.opponent && (
              <button
                onClick={() => setViewingPlayer("opponent")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                  viewingPlayer === "opponent"
                    ? "border-red-400 text-red-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <div className="w-6 h-6 border border-red-500/30 flex items-center justify-center font-mono text-xs text-red-400">
                  {roomData.opponent.username[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-display font-semibold text-xs">{roomData.opponent.username}</p>
                  <p className="font-mono text-xs opacity-60">⚡{roomData.opponent.rating}</p>
                </div>
                {opponentState.isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1" />
                )}
                {opponentState.lastStatus && !opponentState.isRunning && (
                  <span className={`font-mono text-xs ml-1 ${STATUS_COLOR[opponentState.lastStatus] ?? ""}`}>
                    {opponentState.lastStatus === "ACCEPTED" ? "✓" : "✗"}
                  </span>
                )}
              </button>
            )}

            {/* Right side — status + language */}
            <div className="ml-auto flex items-center gap-3 px-4 font-mono text-xs text-muted-foreground">
              {currentState.language && currentState.code && (
                <span className="px-2 py-0.5 border border-border">
                  {LANG_LABELS[currentState.language] ?? currentState.language}
                </span>
              )}
              {currentState.lastStatus && (
                <span className={STATUS_COLOR[currentState.lastStatus] ?? "text-muted-foreground"}>
                  {currentState.lastStatus.replace(/_/g, " ")}
                </span>
              )}
              {currentState.submissionCount > 0 && (
                <span>{currentState.submissionCount} attempt{currentState.submissionCount !== 1 ? "s" : ""}</span>
              )}
              <span className="flex items-center gap-1 text-cyan-400/50">
                <Eye size={10} /> READ ONLY
              </span>
            </div>
          </div>

          {/* Editor or placeholder */}
          <div className="flex-1 overflow-hidden">
            {currentState.code ? (
              <CodeEditor
                language={currentState.language}
                value={currentState.code}
                onChange={() => {}}
                readOnly={true}
                darkMode={true}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-[#0a0f0d]">
                <div className="text-center space-y-3">
                  <Code size={40} className="text-green-400/15 mx-auto" />
                  <p className="font-mono text-xs text-muted-foreground tracking-widest">
                    WAITING FOR {currentPlayer?.username.toUpperCase() ?? "PLAYER"} TO TYPE
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/40">
                    Code appears here as they write
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}