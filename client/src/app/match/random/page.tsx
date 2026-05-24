"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Swords, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { subscribeToNotifications } from "@/lib/ws";
import { useMatchStore } from "@/store/matchStore";
import { MatchResponse, Notification } from "@/types";

export default function RandomMatchPage() {
  const router = useRouter();
  const { status, message, queueSize, setStatus, setMessage, setQueueSize, reset } =
    useMatchStore();
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  const { mutate: joinQueue, isPending } = useMutation({
    mutationFn: () =>
      api.post<MatchResponse>("/api/match/random").then((r) => r.data),
    onSuccess: (data) => {
      setStatus(data.status);
      setMessage(data.message);
      if (data.queueSize) setQueueSize(data.queueSize);

      if (data.status === "MATCHED" && data.roomCode) {
        toast.success("Opponent found!");
        router.push(`/room/${data.roomCode}`);
      }
    },
    onError: () => toast.error("Failed to join queue"),
  });

  const { mutate: cancelQueue } = useMutation({
    mutationFn: () => api.delete("/api/match/cancel"),
    onSuccess: () => {
      reset();
      subRef.current?.unsubscribe();
    },
  });

  // Listen for MATCH_FOUND via WebSocket
  useEffect(() => {
    if (status !== "WAITING") return;

    const sub = subscribeToNotifications((raw) => {
      const notif = raw as Notification;
      if (notif.type === "MATCH_FOUND") {
        const p = notif.payload as { roomCode: string };
        toast.success("Opponent found!");
        reset();
        router.push(`/room/${p.roomCode}`);
      }
    });

    subRef.current = sub;
    return () => sub?.unsubscribe();
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-8 rounded-xl border border-border bg-card text-center space-y-6">
        <div className="flex justify-center">
          <div
            className={`p-4 rounded-full ${
              status === "WAITING"
                ? "bg-primary/10 animate-pulse"
                : "bg-muted"
            }`}
          >
            <Swords size={36} className="text-primary" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold">Quick Match</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {status === "IDLE" && "Find a random opponent to battle"}
            {status === "WAITING" && message}
          </p>
          {status === "WAITING" && queueSize > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {queueSize} player{queueSize !== 1 ? "s" : ""} in queue
            </p>
          )}
        </div>

        {status === "IDLE" && (
          <button
            onClick={() => joinQueue()}
            disabled={isPending}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Joining..." : "Find Match"}
          </button>
        )}

        {status === "WAITING" && (
          <button
            onClick={() => cancelQueue()}
            className="w-full py-2 px-4 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
