"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Copy, CheckCircle, Sun, Moon, X , Eye } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { useRoomWebSocket, useReadyUp } from "@/hooks/useRoom";
import { useSubmit } from "@/hooks/useSubmission";
import { RoomResponse, ProblemDetail, Language } from "@/types";



const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <p className="font-mono text-xs text-muted-foreground animate-pulse">LOADING EDITOR...</p>
    </div>
  ),
});

const LANGS = [
  { value: "java",       label: "Java" },
  { value: "python",     label: "Python 3" },
  { value: "cpp",        label: "C++" },
  { value: "javascript", label: "JavaScript" },
  { value: "c",          label: "C" },
];

const STATUS_CLASS: Record<string, string> = {
  ACCEPTED: "status-accepted",
  WRONG_ANSWER: "status-wrong",
  TIME_LIMIT_EXCEEDED: "status-tle",
  COMPILE_ERROR: "status-error",
  RUNTIME_ERROR: "status-error",
  RUNNING: "status-pending",
  PENDING: "status-pending",
};

// ── Countdown timer hook ──────────────────────────────────────────────────────
function useCountdown(startedAt: string | null, durationMinutes: number) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const endTime = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes]);

  return secondsLeft;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { userId, token, username } = useAuthStore();
  const {
    room, setRoom, selectedLanguage, setLanguage,
    code: editorCode, setCode, isSubmitting, opponentActivity,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [darkEditor, setDarkEditor] = useState(true);  // editor theme toggle
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (room?.status === "FINISHED" || room?.status === "EXPIRED") {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [room?.status]);

  // Redirect to dashboard after 5 seconds if the modal is open
  useEffect(() => {
    if ((room?.status === "FINISHED" || room?.status === "EXPIRED") && showModal) {
      const t = setTimeout(() => {
        router.push("/dashboard");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [room?.status, showModal, router]);

  // ── Fetch room ──────────────────────────────────────────────────────────────
  const { data: roomData } = useQuery({
    queryKey: ["room", "code", code],
    queryFn: () => api.get<RoomResponse>(`/api/rooms/code/${code}`).then((r) => r.data),
    enabled: !!code,
    refetchInterval: (q) => {
      const s = (q.state.data as RoomResponse)?.status;
      return s === "CREATED" || s === "WAITING" ? 3000 : false;
    },
  });

  // ── Fetch problem detail ────────────────────────────────────────────────────
  const { data: problemDetail } = useQuery({
    queryKey: ["problem", room?.problem?.id],
    queryFn: () =>
      api.get<ProblemDetail>(`/api/problems/${room?.problem?.id}`).then((r) => r.data),
    enabled: !!room?.problem?.id && room.status === "ACTIVE",
  });

  useEffect(() => { if (roomData) setRoom(roomData); }, [roomData]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  const secondsLeft = useCountdown(room?.startedAt ?? null, room?.duration ?? 30);

  // ── WebSocket ───────────────────────────────────────────────────────────────
useRoomWebSocket(room?.id ?? "");

// ── Spectator count state ────────────────────────────────────────────────────
const [spectatorCount, setSpectatorCount] = useState(0);


// Fetch spectator count every 10s while active
useEffect(() => {
  if (room?.status !== "ACTIVE" || !room?.id) return;
  const id = setInterval(() => {
    api.get<number>(`/api/spectate/count/${room.id}`)
      .then((r) => setSpectatorCount(r.data))
      .catch(() => {});
  }, 10000);
  return () => clearInterval(id);
}, [room?.id, room?.status]);


  // ── Match termination effect ────────────────────────────────────────────────
  // Removed automatic redirect to allow inspecting code

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutate: readyUp, isPending: readying } = useReadyUp(room?.id ?? "");
  const { mutate: submit } = useSubmit();

  // ── Close room (creator only) ───────────────────────────────────────────────
  const { mutate: closeRoom } = useMutation({
    mutationFn: () => api.delete(`/api/rooms/${room?.id}/close`),
    onSuccess: () => {
      toast.success("Room closed");
      router.push("/dashboard");
    },
    onError: () => toast.error("Could not close room"),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!room) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-mono text-xs text-green-500 animate-pulse tracking-widest">
        INITIALIZING ROOM...
      </div>
    </div>
  );

  const isCreator  = room.creator.id === userId;
  const myReady    = isCreator ? room.creatorReady : room.opponentReady;
  const opponent   = isCreator ? room.opponent : room.creator;
  const problem    = room.problem;
  const badgeClass: Record<string, string> = {
    EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard",
  };

  // Removed full screen replacement on finish to render active workspace underneath the modal popup

  // ── Lobby ───────────────────────────────────────────────────────────────────
  if (room.status === "CREATED" || room.status === "WAITING") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="cb-card corner-tl p-8 text-center relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
            <p className="font-mono text-xs text-green-500 tracking-widest mb-6">// ROOM LOBBY</p>

            <div className="relative mb-8">
              <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">ROOM CODE</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-bold text-green-400 tracking-[0.3em] glow-text">
                  {room.code}
                </span>
                <button onClick={copyCode} className="text-muted-foreground hover:text-green-400 transition-colors">
                  {copied
                    ? <CheckCircle size={16} className="text-green-400" />
                    : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { player: room.creator,  ready: room.creatorReady,  label: "HOST" },
                { player: room.opponent, ready: room.opponentReady, label: "OPPONENT" },
              ].map(({ player, ready, label }) => (
                <div key={label}
                  className={`flex items-center justify-between px-4 py-2.5 border ${
                    ready
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{label}</span>
                    <span className="font-display font-semibold text-sm">
                      {player ? player.username : "—"}
                    </span>
                  </div>
                  <span className={`font-mono text-xs ${ready ? "text-green-400" : "text-muted-foreground"}`}>
                    {player ? (ready ? "✓ READY" : "WAITING") : "EMPTY"}
                  </span>
                </div>
              ))}
            </div>

            {!room.opponent && (
              <p className="font-mono text-xs text-muted-foreground animate-pulse tracking-wider mb-4">
                WAITING FOR OPPONENT...
              </p>
            )}

            {room.status === "WAITING" && !myReady && (
              <button onClick={() => readyUp()} disabled={readying} className="btn-primary w-full mb-3">
                {readying ? "..." : "READY UP ✓"}
              </button>
            )}
            {myReady && (
              <p className="font-mono text-xs text-green-400 tracking-wider mb-3">
                READY — WAITING FOR OPPONENT...
              </p>
            )}

            {/* Close room button — creator only */}
            {isCreator && (
              <button
                onClick={() => closeRoom()}
                className="w-full flex items-center justify-center gap-2 font-mono text-xs text-red-400/60 hover:text-red-400 transition-colors mt-2 py-2">
                <X size={12} /> CLOSE ROOM
              </button>
            )}

            <Link href="/dashboard"
              className="block mt-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors tracking-widest">
              ← BACK TO BASE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Active match ─────────────────────────────────────────────────────────────
  const timerColor = secondsLeft !== null && secondsLeft < 120
    ? "text-red-400 animate-pulse"
    : secondsLeft !== null && secondsLeft < 300
    ? "text-yellow-400"
    : "text-green-400";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0 bg-card/80"
        style={{ borderBottomColor: "rgba(34,197,94,0.15)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs font-bold text-green-400 tracking-widest shrink-0">
            {room.code}
          </span>
          {problem && (
            <>
              <span className="text-border">|</span>
              <span className="font-display font-semibold text-sm truncate">{problem.title}</span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                badgeClass[problem.difficulty] ?? "badge-easy"}`}>
                {problem.difficulty}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* ── COUNTDOWN TIMER ── */}
          {secondsLeft !== null && (
            <div className={`font-mono text-sm font-bold tracking-widest ${timerColor}`}>
              ⏱ {formatTime(secondsLeft)}
            </div>
          )}
          {/* Spectator count */}
{spectatorCount > 0 && (
  <span className="flex items-center gap-1 font-mono text-xs text-cyan-400/70">
    <Eye size={11} /> {spectatorCount}
  </span>
)}

          {/* Opponent info */}
          {opponent && (
            <div className="font-mono text-xs text-muted-foreground hidden sm:flex items-center gap-2">
              VS <span className="text-foreground font-bold">{opponent.username}</span>
              <span className="text-muted-foreground">⚡{opponent.rating}</span>
              {opponentActivity.isRunning && (
                <span className="text-cyan-400 animate-pulse">RUNNING...</span>
              )}
              {opponentActivity.lastStatus && (
                <span className={STATUS_CLASS[opponentActivity.lastStatus] ?? "text-muted-foreground"}>
                  {opponentActivity.lastStatus.replace(/_/g, " ")}
                </span>
              )}
            </div>
          )}

          {/* ── EDITOR THEME TOGGLE ── */}
          <button
            onClick={() => setDarkEditor(!darkEditor)}
            className="p-1.5 text-muted-foreground hover:text-green-400 transition-colors mr-2"
            title="Toggle editor theme">
            {darkEditor ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {room.status !== "ACTIVE" && (
            <Link
              href="/profile"
              className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] tracking-widest hover:bg-red-500/20 transition-colors rounded"
            >
              LEAVE MATCH
            </Link>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Problem panel ── */}
        <div className="w-[42%] border-r overflow-y-auto p-5 space-y-4 shrink-0"
          style={{ borderRightColor: "rgba(34,197,94,0.1)" }}>
          {problemDetail ? (
            <>
              <div>
                <h2 className="font-display text-xl font-bold">{problemDetail.title}</h2>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  TIME: {problemDetail.timeLimit}ms · MEM: {problemDetail.memoryLimit}MB
                </p>
                {problemDetail.tags?.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {problemDetail.tags.map((t) => (
                      <span key={t} className="font-mono text-xs px-2 py-0.5 border border-border text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {problemDetail.description}
              </p>

              {/* Input format */}
              {problemDetail.inputFormat && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">INPUT FORMAT</p>
                  <p className="text-sm leading-relaxed">{problemDetail.inputFormat}</p>
                </div>
              )}

              {/* Output format */}
              {problemDetail.outputFormat && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">OUTPUT FORMAT</p>
                  <p className="text-sm leading-relaxed">{problemDetail.outputFormat}</p>
                </div>
              )}

              {/* Constraints */}
              {problemDetail.constraints && (
                <div>
                  <p className="font-mono text-xs text-green-500 tracking-widest mb-1">CONSTRAINTS</p>
                  <pre className="font-mono text-xs bg-muted/30 border border-border p-3 whitespace-pre-wrap leading-relaxed">
                    {problemDetail.constraints}
                  </pre>
                </div>
              )}

              {/* Sample test cases */}
              {problemDetail.sampleTestCases?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-green-500 tracking-widest">EXAMPLES</p>
                  {problemDetail.sampleTestCases.map((tc, i) => (
                    <div key={tc.id} className="border border-border overflow-hidden">
                      <div className="px-3 py-1.5 bg-muted/30 font-mono text-xs text-muted-foreground">
                        EXAMPLE {i + 1}
                      </div>
                      <div className="px-3 py-2 space-y-1 font-mono text-xs">
                        <div>
                          <span className="text-muted-foreground">INPUT:  </span>
                          <span>{tc.input}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">OUTPUT: </span>
                          <span className="text-green-400">{tc.expectedOutput}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Note section (Codeforces-style) */}
              {problemDetail.note && (
                <div>
                  <p className="font-mono text-xs text-cyan-500 tracking-widest mb-1">NOTE</p>
                  <p className="text-sm leading-relaxed text-foreground/80 italic">
                    {problemDetail.note}
                  </p>
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
        </div>

        {/* ── Editor panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 bg-card/50"
            style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}>
            <select
              value={selectedLanguage}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="font-mono text-xs bg-muted/50 border border-border px-2 py-1 focus:outline-none text-foreground">
              {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={selectedLanguage}
              value={editorCode}
              onChange={(v) => setCode(v ?? "")}
              darkMode={darkEditor}
              readOnly={room.status !== "ACTIVE"}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-card/50"
            style={{ borderTopColor: "rgba(34,197,94,0.1)" }}>
            <div className="font-mono text-xs text-muted-foreground">
              {secondsLeft !== null && secondsLeft < 60 && (
                <span className="text-red-400 animate-pulse">⚠ LESS THAN 1 MINUTE!</span>
              )}
            </div>
            <button
              onClick={() => problem && room && submit({
                roomId: room.id, problemId: problem.id,
                code: editorCode, language: selectedLanguage,
              })}
              disabled={isSubmitting || !editorCode.trim() || room.status !== "ACTIVE"}
              className="btn-primary px-8">
              {isSubmitting ? "SUBMITTING..." : "SUBMIT ⚡"}
            </button>
          </div>
        </div>
      </div>

      {/* Victory/Defeat Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          {/* Confetti particles — winner only */}
          {room.winnerId === userId && room.status !== "EXPIRED" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-5%`,
                    backgroundColor: [
                      "#22c55e", "#3b82f6", "#eab308", "#f43f5e",
                      "#a855f7", "#06b6d4", "#f97316",
                    ][i % 7],
                    animation: `confettiFall ${2.5 + Math.random() * 3}s ${
                      Math.random() * 2
                    }s linear infinite`,
                    opacity: 0.9,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Main modal card */}
          <div
            className="cb-card corner-tl p-8 text-center w-full max-w-sm relative mx-4 bg-card/95 shadow-2xl border"
            style={{
              animation: "scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              borderColor: room.status === "EXPIRED" || !room.winnerId
                ? "rgba(234, 179, 8, 0.3)"
                : room.winnerId === userId
                ? "rgba(34, 197, 94, 0.3)"
                : "rgba(244, 63, 94, 0.2)",
            }}
          >
            <div
              className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                room.status === "EXPIRED" || !room.winnerId
                  ? "via-yellow-500/50"
                  : room.winnerId === userId
                  ? "via-green-500/50"
                  : "via-red-500/40"
              } to-transparent`}
            />

            {/* Close button at top right */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              title="Close to inspect code"
            >
              <X size={16} />
            </button>

            {/* Emoji with bounce */}
            <div
              className="text-6xl mb-4"
              style={{ animation: "bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s both" }}
            >
              {room.status === "EXPIRED" || !room.winnerId ? "⏰" : room.winnerId === userId ? "🏆" : "💀"}
            </div>

            {/* Title with fade-in */}
            <h2
              className={`font-display text-2xl font-bold tracking-wider mb-2 ${
                room.status === "EXPIRED" || !room.winnerId
                  ? "text-yellow-400"
                  : room.winnerId === userId
                  ? "text-green-400"
                  : "text-red-400"
              }`}
              style={{ animation: "fadeSlideUp 0.4s ease-out 0.2s both" }}
            >
              {room.status === "EXPIRED" || !room.winnerId ? "TIME'S UP" : room.winnerId === userId ? "VICTORY" : "DEFEATED"}
            </h2>

            <p
              className="font-mono text-xs text-muted-foreground mb-6 tracking-wider leading-relaxed"
              style={{ animation: "fadeSlideUp 0.4s ease-out 0.3s both" }}
            >
              {room.status === "EXPIRED" || !room.winnerId
                ? "NEITHER PLAYER SOLVED IT IN TIME"
                : room.winnerId === userId
                ? "YOU SOLVED IT FIRST!"
                : "OPPONENT WAS FASTER"}
            </p>

            {/* <div
              className="flex flex-col gap-2"
              style={{ animation: "fadeSlideUp 0.4s ease-out 0.4s both" }}
            >
              <Link
                href="/profile"
                className="btn-primary w-full py-2 block text-center text-xs font-mono tracking-widest"
              >
                VIEW RESULTS →
              </Link>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-mono text-muted-foreground hover:text-foreground tracking-widest"
              >
                INSPECT CODE
              </button>
            </div> */}
          </div>

          {/* Inline keyframe styles */}
          <style jsx>{`
            @keyframes scaleIn {
              0% { opacity: 0; transform: scale(0.8); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes bounceIn {
              0% { opacity: 0; transform: scale(0.3); }
              50% { transform: scale(1.1); }
              70% { transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeSlideUp {
              0% { opacity: 0; transform: translateY(12px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
