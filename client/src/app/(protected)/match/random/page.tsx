"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Swords, X, Plus, Hash, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useMatchStore } from "@/store/matchStore";
import { useAuthStore } from "@/store/authStore";
import { useJoinRoom } from "@/hooks/useRoom";
import { MatchResponse, RoomResponse } from "@/types";

export default function RandomMatchPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { status, message, queueSize, setStatus, setMessage, setQueueSize, reset } = useMatchStore();
  const [roomCode, setRoomCode] = useState("");
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (status !== "WAITING") return;
    const id = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(id);
  }, [status]);

  // ── Check if user already has an open room ──────────────────────────────────
  const { data: myActiveRoom } = useQuery({
    queryKey: ["room", "my-active"],
    queryFn: () => api.get<RoomResponse>("/api/rooms/my-active").then((r) => r.data),
    retry: false,
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
    mutationFn: () => api.post<RoomResponse>("/api/rooms/create", {duration: 2}).then((r) => r.data),
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
            onClick={() => createRoom()}
            disabled={creating}
            className="btn-secondary w-full">
            {creating ? "INITIALIZING..." : "INITIALIZE ROOM"}
          </button>
        </div>

      </div>
    </div>
  );
}
