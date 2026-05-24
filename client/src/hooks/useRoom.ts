import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import {
  subscribeToRoom,
  subscribeToMatch,
  subscribeToNotifications,
} from "@/lib/ws";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import {
  RoomResponse,
  RoomEvent,
  SubmissionEvent,
  Notification,
} from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ["room", roomId],
    queryFn: () =>
      api.get<RoomResponse>(`/api/rooms/${roomId}`).then((r) => r.data),
    enabled: !!roomId,
    refetchInterval: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRoom() {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { problemId?: string; duration?: number }) =>
      api.post<RoomResponse>("/api/rooms/create", data).then((r) => r.data),
    onSuccess: (room) => router.push(`/room/${room.code}`),
    onError: () => toast.error("Failed to create room"),
  });
}

export function useJoinRoom() {
  const router = useRouter();
  return useMutation({
    mutationFn: (code: string) =>
      api.post<RoomResponse>(`/api/rooms/join/${code}`).then((r) => r.data),
    onSuccess: (room) => router.push(`/room/${room.code}`),
    onError: () => toast.error("Room not found or no longer open"),
  });
}

export function useReadyUp(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<RoomResponse>(`/api/rooms/${roomId}/ready`).then((r) => r.data),
    onSuccess: (room) => qc.setQueryData(["room", roomId], room),
    onError: () => toast.error("Failed to ready up"),
  });
}

// ─── WebSocket subscription ───────────────────────────────────────────────────

export function useRoomWebSocket(roomId: string) {
  const qc = useQueryClient();
  const { setRoom, setOpponentActivity } = useRoomStore();
  const { userId } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!roomId) return;

    const roomSub = subscribeToRoom(roomId, (raw) => {
      const event = raw as RoomEvent;

      if (event.type === "OPPONENT_JOINED") {
        toast.success("Opponent joined!");
        qc.invalidateQueries({ queryKey: ["room", roomId] });
      }

      if (event.type === "PLAYER_READY") {
        toast(`Player readied up!`);
        qc.invalidateQueries({ queryKey: ["room", roomId] });
      }

      if (event.type === "MATCH_STARTED") {
        toast.success("Match started! Good luck!");
        qc.invalidateQueries({ queryKey: ["room", roomId] });
      }

      if (event.type === "MATCH_ENDED") {
        const payload = event.payload as { winnerId: string; winnerUsername: string };
        const won = payload.winnerId === userId;
        toast[won ? "success" : "error"](
          won ? "You won! 🏆" : `${payload.winnerUsername} won. Better luck next time!`
        );
        qc.invalidateQueries({ queryKey: ["room", roomId] });
      }
    });

    const matchSub = subscribeToMatch(roomId, (raw) => {
      const event = raw as SubmissionEvent;

      if (event.type === "SUBMISSION_RUNNING" && event.userId !== userId) {
        setOpponentActivity({ isRunning: true, lastStatus: null });
      }

      if (event.type === "SUBMISSION_RESULT" && event.userId !== userId) {
        setOpponentActivity({
          isRunning: false,
          lastStatus: event.status,
          executionTime: event.executionTime,
        });
        if (event.status === "ACCEPTED") {
          toast.error("Opponent solved it first!");
        }
      }
    });

    const notifSub = subscribeToNotifications((raw) => {
      const notif = raw as Notification;
      if (notif.type === "ACHIEVEMENT_UNLOCKED") {
        const p = notif.payload as { title: string; xpReward: number };
        toast.success(`🏅 Achievement: ${p.title} (+${p.xpReward} XP)`);
      }
    });

    return () => {
      roomSub?.unsubscribe();
      matchSub?.unsubscribe();
      notifSub?.unsubscribe();
    };
  }, [roomId, userId]);
}
