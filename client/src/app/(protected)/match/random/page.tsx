"use client";

import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Swords, X, Plus, Hash, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useMatchStore } from "@/store/matchStore";
import { useAuthStore } from "@/store/authStore";
import { useJoinRoom } from "@/hooks/useRoom";
import { MatchResponse, RoomResponse, ProblemSummary } from "@/types";

export default function RandomMatchPage() {
  const router = useRouter();
  const { token, userId } = useAuthStore();
  const { status, message, queueSize, setStatus, setMessage, setQueueSize, reset } = useMatchStore();
  const [roomCode, setRoomCode] = useState("");
  const [dots, setDots] = useState(".");

  // ── States for custom room creation ────────────────────────────────────────
  const [duration, setDuration] = useState(30);
  const [problemSearch, setProblemSearch] = useState("");
  const [selectedProblem, setSelectedProblem] = useState<ProblemSummary | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "WAITING") return;
    const id = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(id);
  }, [status]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch problems for custom room creation ─────────────────────────────────
  const { data: problems = [] } = useQuery<ProblemSummary[]>({
    queryKey: ["problems"],
    queryFn: () => api.get<ProblemSummary[]>("/api/problems").then((r) => r.data),
  });

  const filteredProblems = (problems || []).filter((p) => {
    if (!p) return false;
    const titleMatch = p.title ? p.title.toLowerCase().includes((problemSearch || "").toLowerCase()) : false;
    const topicMatch = p.topic ? p.topic.toLowerCase().includes((problemSearch || "").toLowerCase()) : false;
    return titleMatch || topicMatch;
  });

  // ── Check if user already has an open room ──────────────────────────────────
  const { data: myActiveRoom } = useQuery({
    queryKey: ["room", "my-active", userId],  // userId in key = separate cache per account
    queryFn: () => api.get<RoomResponse>("/api/rooms/my-active").then((r) => r.data),
    enabled: !!userId,   // only run when logged in
    retry: false,
    staleTime: 0,        // never serve stale data from previous user's session
  });

  // ── Join matchmaking queue ──────────────────────────────────────────────────
  const { mutate: joinQueue, isPending } = useMutation({
    mutationFn: () => api.post<MatchResponse>("/api/match/random").then((r) => r.data),
    onSuccess: (data) => {
      setStatus(data.status);
      setMessage(data.message);
      if (data.queueSize) setQueueSize(data.queueSize);
      if (data.status === "MATCHED" && data.roomCode) {
        toast.success("OPPONENT FOUND!");
        reset();
        router.push(`/room/${data.roomCode}`);
      }
    },
    onError: (error: any) => {
      const msg: string = error?.response?.data?.error ?? "";
      // 409 — user already has an active/waiting room
      const match = msg.match(/active room\s*([A-Z0-9]{4,8})/i);
      if (match) {
        toast.error("You already have an active room. Redirecting...");
        router.push(`/room/${match[1]}`);
      } else {
        toast.error("Failed to join queue");
      }
    },
  });

  // ── Cancel matchmaking ──────────────────────────────────────────────────────
  const { mutate: cancelQueue } = useMutation({
    mutationFn: () => api.delete("/api/match/cancel"),
    onSuccess: () => { reset(); },
  });

  // ── Join by room code ───────────────────────────────────────────────────────
  const { mutate: joinRoom, isPending: joiningRoom } = useJoinRoom();

  
  // ── Create a private room ───────────────────────────────────────────────────
  const { mutate: createRoom, isPending: creating } = useMutation({
    mutationFn: (data: { problemId?: string | null; duration?: number }) =>
      api.post<RoomResponse>("/api/rooms/create", data).then((r) => r.data),
    onSuccess: (room) => router.push(`/room/${room.code}`),
    onError: (error: any) => {
      const msg: string = error?.response?.data?.error ?? "";
      const match = msg.match(/active room\s*([A-Z0-9]{4,8})/i);
      if (match) {
        // Already have a room — show code and offer to go there
        toast.error(`You already have room ${match[1]}. Redirecting...`);
        router.push(`/room/${match[1]}`);
      } else {
        toast.error("Failed to create room");
      }
    },
  });

  // MATCH_FOUND is now handled globally by useNotifications() in Navbar.
  // No duplicate WS subscription needed here.

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* ── Existing open room banner ── */}
        {myActiveRoom && (
          <div className="cb-card p-4 border-yellow-500/30 bg-yellow-500/5 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
            <p className="font-mono text-xs text-yellow-500 tracking-widest mb-2">
              // YOU HAVE AN OPEN ROOM
            </p>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-2xl font-bold text-yellow-400 tracking-widest">
                  {myActiveRoom.code}
                </span>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Status: {myActiveRoom.status}
                </p>
              </div>
              <button
                onClick={() => router.push(`/room/${myActiveRoom.code}`)}
                className="btn-primary flex items-center gap-2 px-4"
                style={{ borderColor: "rgba(234,179,8,.5)", color: "#eab308" }}>
                REJOIN <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── Quick Match card ── */}
        <div className="cb-card corner-tl p-8 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

          {status === "IDLE" && (
            <>
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 border-2 border-green-500/20 rotate-45" />
                <div className="absolute inset-2 border border-green-500/10 rotate-45" />
                <Swords size={36} className="text-green-400 relative z-10" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-wider mb-2">QUICK BATTLE</h1>
              <p className="font-mono text-xs text-muted-foreground tracking-wider mb-8">
                MATCHMAKING BY ELO RATING
              </p>
              <button
                onClick={() => joinQueue()}
                disabled={isPending}
                className="btn-primary w-full text-sm">
                {isPending ? "CONNECTING..." : "FIND OPPONENT →"}
              </button>
            </>
          )}

          {status === "WAITING" && (
            <>
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 border-2 border-green-500/40 rotate-45 animate-spin"
                  style={{ animationDuration: "4s" }} />
                <div className="absolute inset-3 border border-green-500/20 -rotate-45 animate-spin"
                  style={{ animationDuration: "3s", animationDirection: "reverse" }} />
                <Swords size={36} className="text-green-400 relative z-10 animate-pulse" />
              </div>
              <h2 className="font-display text-2xl font-bold text-green-400 tracking-wider mb-2">
                SEARCHING{dots}
              </h2>
              <p className="font-mono text-xs text-muted-foreground mb-1">
                {message || "SCANNING FOR OPPONENTS"}
              </p>
              {queueSize > 0 && (
                <p className="font-mono text-xs text-green-500/70 mb-6">
                  {queueSize} OPERATOR{queueSize !== 1 ? "S" : ""} IN QUEUE
                </p>
              )}
              <button
                onClick={() => cancelQueue()}
                className="btn-secondary w-full flex items-center justify-center gap-2">
                <X size={12} /> CANCEL SEARCH
              </button>
            </>
          )}
        </div>

        {/* ── Join by code ── */}
        <div className="cb-card p-5">
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
            <Hash size={11} /> JOIN BY ROOM CODE
          </p>
          <div className="flex gap-2">
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && roomCode && joinRoom(roomCode)}
              placeholder="ENTER CODE..."
              maxLength={6}
              className="cb-input uppercase font-mono tracking-widest text-center text-green-400"
            />
            <button
              onClick={() => roomCode && joinRoom(roomCode)}
              disabled={joiningRoom || !roomCode}
              className="btn-primary flex items-center gap-1.5 shrink-0 px-4">
              <Plus size={12} /> JOIN
            </button>
          </div>
        </div>

        {/* ── Create private room ── */}
        <div className="cb-card p-5">
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-3">
            // CREATE PRIVATE ROOM
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-secondary w-full">
            INITIALIZE ROOM
          </button>
        </div>

      </div>

      {/* ── Initialize Room Modal Overlay ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div 
            className="cb-card corner-tl p-6 w-full max-w-sm relative mx-4 bg-card/95 shadow-2xl border border-green-500/20 space-y-4 !overflow-visible"
            style={{ overflow: "visible" }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Close modal"
            >
              <X size={16} />
            </button>

            <h3 className="font-mono text-xs text-green-400 tracking-widest">
              // INITIALIZE PRIVATE ROOM
            </h3>

            {/* Match Duration Selector */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-muted-foreground tracking-wider block">
                MATCH DURATION (MINUTES)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => {
                  const isActive = duration === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`font-mono text-[11px] py-1.5 border rounded transition-all duration-200 ${
                        isActive
                          ? "border-green-500 bg-green-500/10 text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                          : "border-border bg-transparent text-muted-foreground hover:border-green-500/30 hover:text-foreground"
                      }`}
                    >
                      {mins}M
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Problem Selector Dropdown */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="font-mono text-[10px] text-muted-foreground tracking-wider block">
                BATTLE PROBLEM
              </label>

              {selectedProblem ? (
                <div className="flex items-center justify-between p-3 border border-green-500/20 bg-green-500/5 text-xs rounded">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-green-400">✓</span>
                    <span className="font-display font-semibold truncate text-green-400">
                      {selectedProblem.title}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                      selectedProblem.difficulty === "EASY" ? "bg-green-500/10 text-green-400" :
                      selectedProblem.difficulty === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {selectedProblem.difficulty}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProblem(null)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search problem, or leave empty for random..."
                    value={problemSearch}
                    onChange={(e) => {
                      setProblemSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="cb-input w-full text-xs text-left"
                  />

                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 border border-border bg-card shadow-2xl max-h-48 overflow-y-auto rounded-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProblem(null);
                          setProblemSearch("");
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-green-500/8 transition-colors border-b border-border/50 text-left text-xs font-mono text-muted-foreground"
                      >
                        🎲 RANDOM PROBLEM (DEFAULT)
                      </button>
                      {filteredProblems.length === 0 ? (
                        <div className="px-4 py-2.5 text-xs font-mono text-muted-foreground text-center">
                          NO PROBLEMS FOUND
                        </div>
                      ) : (
                        filteredProblems.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProblem(p);
                              setProblemSearch("");
                              setShowDropdown(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-500/8 transition-colors border-b border-border/50 text-left text-xs"
                          >
                            <span className="font-display font-medium text-foreground truncate mr-2">
                              {p.title}
                            </span>
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              p.difficulty === "EASY" ? "bg-green-500/10 text-green-400" :
                              p.difficulty === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-red-500/10 text-red-400"
                            }`}>
                              {p.difficulty}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary flex-1 py-2 text-xs">
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  createRoom({
                    problemId: selectedProblem ? selectedProblem.id : null,
                    duration,
                  });
                  setIsModalOpen(false);
                }}
                disabled={creating}
                className="btn-primary flex-1 py-2 text-xs">
                {creating ? "CREATING..." : "START BATTLE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}