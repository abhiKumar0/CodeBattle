import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, subscribeToNotifications } from "@/lib/ws";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, AppNotification } from "@/store/notificationStore";

// Notification type → emoji icon
export const NOTIF_ICON: Record<string, string> = {
  MATCH_RESULT:        "⚔️",
  RATING_UPDATE:       "📈",
  ACHIEVEMENT:         "🏅",
  FRIEND_REQUEST:      "👤",
  FRIEND_ACCEPTED:     "✅",
  CHALLENGE_RECEIVED:  "⚔️",
  CHALLENGE_ACCEPTED:  "🎯",
  DAILY_PROBLEM:       "🧩",
  RANK_UP:             "🏆",
  SYSTEM:              "📢",
};

// ── Hook: fetch initial notifications + subscribe to WebSocket ────────────────
export function useNotifications() {
  const { token, isAuthenticated, username } = useAuthStore();
  const {
    setNotifications, prependNotification,
    setUnreadCount, markAllRead: markAllLocal,
  } = useNotificationStore();
  const router = useRouter();

  // Fetch initial list
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<AppNotification[]>("/api/notifications").then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () =>
      api.get<{ unread: number }>("/api/notifications/unread-count").then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 1000 * 60, // refresh every minute
  });

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data]);

  useEffect(() => {
    if (countData) setUnreadCount(countData.unread);
  }, [countData]);

  // WebSocket realtime push
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let sub: { unsubscribe: () => void } | null = null;

    connectStomp(token).then(() => {
      sub = subscribeToNotifications((raw: any) => {
        const { type, payload } = raw;

        if (type === "NEW_NOTIFICATION") {
          // New persistent notification
          prependNotification(payload as AppNotification);
          // Show toast
          const icon = NOTIF_ICON[payload.type] ?? "🔔";
          toast(icon + " " + payload.title, {
            duration: 4000,
            onClick: payload.actionUrl
              ? () => router.push(payload.actionUrl)
              : undefined,
          } as any);
        }

        if (type === "UNREAD_COUNT") {
          setUnreadCount(payload.count);
        }

        // MATCH_FOUND is realtime-only, not persisted
        if (type === "MATCH_FOUND") {
          const p = payload as { roomCode: string };
          toast.success("OPPONENT FOUND!");
          router.push(`/room/${p.roomCode}`);
        }
      });
    });

    return () => sub?.unsubscribe();
  }, [isAuthenticated, token]);
}

// ── Hook: mark all read ───────────────────────────────────────────────────────
export function useMarkAllRead() {
  const markAllLocal = useNotificationStore((s) => s.markAllRead);
  return useMutation({
    mutationFn: () => api.put("/api/notifications/read-all"),
    onSuccess: () => markAllLocal(),
  });
}

// ── Hook: mark one read ───────────────────────────────────────────────────────
export function useMarkOneRead() {
  const markRead = useNotificationStore((s) => s.markRead);
  return useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`),
    onSuccess: (_, id) => markRead(id),
  });
}
