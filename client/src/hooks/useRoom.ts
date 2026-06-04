import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, subscribeToRoom, subscribeToMatch } from "@/lib/ws";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { RoomResponse, RoomEvent, SubmissionEvent } from "@/types";

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ["room", roomId],
    queryFn: () => api.get<RoomResponse>(`/api/rooms/${roomId}`).then((r) => r.data),
    enabled: !!roomId,
  });
}

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

export function useRoomWebSocket(roomId: string) {
  const qc = useQueryClient();
  const { setOpponentActivity } = useRoomStore();
  const { userId, token } = useAuthStore();

  useEffect(() => {
    if (!roomId || !token) return;

    let roomSub: any = null;
    let matchSub: any = null;
    let mounted = true;

    // Reuse the single global STOMP connection
    connectStomp(token).then(() => {
      if (!mounted) return;

      // Subscribe to room events (join, ready, start, end)
      roomSub = subscribeToRoom(roomId, (raw) => {
        const event = raw as RoomEvent;
        if (event.type === "OPPONENT_JOINED") {
          toast.success("Opponent joined!");
          qc.invalidateQueries({ queryKey: ["room", "code"] });
        }
        if (event.type === "PLAYER_READY") {
          toast("Player readied up!");
          qc.invalidateQueries({ queryKey: ["room", "code"] });
        }
        if (event.type === "MATCH_STARTED") {
          toast.success("Match started! Good luck!");
          qc.invalidateQueries({ queryKey: ["room", "code"] });
        }
        if (event.type === "MATCH_ENDED") {
          const payload = event.payload as { winnerId: string; winnerUsername: string; reason?: string };
          const won = payload.winnerId === userId;
          toast[won ? "success" : "error"](
            won ? "You won! 🏆" : `${payload.winnerUsername} won. Better luck next time!`
          );
          const newStatus = payload.reason === "TIME_UP" ? "EXPIRED" : "FINISHED";
          useRoomStore.getState().updateRoomStatus({
            status: newStatus,
            winnerId: payload.winnerId || null,
          });
          qc.invalidateQueries({ queryKey: ["room"] });
        }
      });

      // Subscribe to match events (submission running/result)
      matchSub = subscribeToMatch(roomId, (raw) => {
        const event = raw as SubmissionEvent;
        if (event.type === "SUBMISSION_RUNNING") {
          if (event.userId !== userId) {
            setOpponentActivity({ isRunning: true, lastStatus: null });
          }
        }
        if (event.type === "SUBMISSION_RESULT") {
          if (event.userId !== userId) {
            setOpponentActivity({ isRunning: false, lastStatus: event.status, executionTime: event.executionTime });
            if (event.status === "ACCEPTED") {
              toast.error("Opponent solved it first!");
            }
          } else {
            toast.dismiss("submit");
            if (event.status === "ACCEPTED") {
              toast.success("All test cases passed! You solved the problem! 🎉");
            } else {
              const statusText = event.status.replace(/_/g, " ");
              toast.error(`Submission result: ${statusText}`);
            }
          }
        }
      });

      // NOTE: No notification subscription here!
      // Notifications are handled globally by useNotifications() in Navbar.

    }).catch((err) => {
      console.error("Failed to connect to WS:", err);
    });

    return () => {
      mounted = false;
      roomSub?.unsubscribe();
      matchSub?.unsubscribe();
    };
  }, [roomId, token, userId]);
}
