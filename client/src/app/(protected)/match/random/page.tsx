"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Swords, X, Plus, Hash } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, subscribeToNotifications } from "@/lib/ws";
import { useMatchStore } from "@/store/matchStore";
import { useAuthStore } from "@/store/authStore";
import { useJoinRoom } from "@/hooks/useRoom";
import { MatchResponse, Notification } from "@/types";

export default function RandomMatchPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { status, message, queueSize, setStatus, setMessage, setQueueSize, reset } = useMatchStore();
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (status !== "WAITING") return;
    const id = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(id);
  }, [status]);

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
    onError: () => toast.error("Failed to join queue"),
  });

  const { mutate: cancelQueue } = useMutation({
    mutationFn: () => api.delete("/api/match/cancel"),
    onSuccess: () => { reset(); subRef.current?.unsubscribe(); },
  });

  const { mutate: joinRoom, isPending: joiningRoom } = useJoinRoom();

  useEffect(() => {
    if (status !== "WAITING" || !token) return;
    connectStomp(token).then(() => {
      const sub = subscribeToNotifications((raw) => {
        const notif = raw as Notification;
        if (notif.type === "MATCH_FOUND") {
          const p = notif.payload as { roomCode: string };
          toast.success("OPPONENT FOUND!");
          reset();
          router.push(`/room/${p.roomCode}`);
        }
      });
      subRef.current = sub;
    });
    return () => subRef.current?.unsubscribe();
  }, [status]);

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Main battle card */}
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
              <button onClick={() => joinQueue()} disabled={isPending} className="btn-primary w-full text-sm">
                {isPending ? "CONNECTING..." : "FIND OPPONENT →"}
              </button>
            </>
          )}

          {status === "WAITING" && (
            <>
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 border-2 border-green-500/40 rotate-45 animate-spin" style={{ animationDuration: "4s" }} />
                <div className="absolute inset-3 border border-green-500/20 -rotate-45 animate-spin" style={{ animationDuration: "3s", animationDirection: "reverse" }} />
                <Swords size={36} className="text-green-400 relative z-10 animate-pulse" />
              </div>
              <h2 className="font-display text-2xl font-bold text-green-400 tracking-wider mb-2">SEARCHING{dots}</h2>
              <p className="font-mono text-xs text-muted-foreground mb-2">{message || "SCANNING FOR OPPONENTS"}</p>
              {queueSize > 0 && (
                <p className="font-mono text-xs text-green-500/70 mb-6">{queueSize} OPERATOR{queueSize !== 1 ? "S" : ""} IN QUEUE</p>
              )}
              <button onClick={() => cancelQueue()} className="btn-secondary w-full flex items-center justify-center gap-2">
                <X size={12} /> CANCEL SEARCH
              </button>
            </>
          )}
        </div>

        {/* Join by code */}
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
            <button onClick={() => roomCode && joinRoom(roomCode)} disabled={joiningRoom || !roomCode}
              className="btn-primary flex items-center gap-1.5 shrink-0 px-4">
              <Plus size={12} /> JOIN
            </button>
          </div>
        </div>

        {/* Create private room */}
        <div className="cb-card p-5">
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-3">// CREATE PRIVATE ROOM</p>
          <button
            onClick={() => api.post("/api/rooms/create", {}).then((r: any) => router.push(`/room/${r.data.code}`))}
            className="btn-secondary w-full">
            INITIALIZE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
