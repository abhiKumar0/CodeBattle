import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, onNotification } from "@/lib/ws";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, AppNotification } from "@/store/notificationStore";

export const NOTIF_ICON: Record<string, string> = {
  MATCH_RESULT:       "⚔️",
  RATING_UPDATE:      "📈",
  ACHIEVEMENT:        "🏅",
  FRIEND_REQUEST:     "👤",
  FRIEND_ACCEPTED:    "✅",
  CHALLENGE_RECEIVED: "⚔️",
  CHALLENGE_ACCEPTED: "🎯",
  DAILY_PROBLEM:      "🧩",
  RANK_UP:            "🏆",
  SYSTEM:             "📢",
};

// ── Hook: call once in Navbar — connects WS + listens for notifications ──────
export function useNotifications() {
  const { token, isAuthenticated } = useAuthStore();
  const { setNotifications, prependNotification, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const qc = useQueryClient();

  // Fetch notifications on mount
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<AppNotification[]>("/api/notifications").then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const { data: countData } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () =>
      api.get<{ unread: number }>("/api/notifications/unread-count").then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  useEffect(() => { if (data) setNotifications(data); }, [data]);
  useEffect(() => { if (countData) setUnreadCount(countData.unread); }, [countData]);

  // Connect WS + register notification listener
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Connect the single STOMP client (idempotent — only connects once)
    connectStomp(token).catch((err) => console.error("WS connect failed:", err));

    // Register a listener for all notification events
    const unsubscribe = onNotification((type, payload) => {
      if (type === "NEW_NOTIFICATION") {
        prependNotification(payload as AppNotification);
        setUnreadCount((prev: number) => prev + 1);

        const icon = NOTIF_ICON[payload.type] ?? "🔔";
        toast(`${icon} ${payload.title}`, {
          duration: 4000,
          style: {
            background: "hsl(220, 18%, 7%)",
            color: "#d1fae5",
            border: "1px solid rgba(34,197,94,0.25)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
          },
        });

        // Refetch relevant queries
        qc.invalidateQueries({ queryKey: ["notifications"] });
        if (payload.type === "FRIEND_REQUEST" || payload.type === "FRIEND_ACCEPTED") {
          qc.invalidateQueries({ queryKey: ["friends"] });
          qc.invalidateQueries({ queryKey: ["friends", "pending"] });
          
        }
        if (payload.type === "CHALLENGE_RECEIVED" || payload.type === "CHALLENGE_ACCEPTED") {
          qc.invalidateQueries({ queryKey: ["challenges"] });
        }
      }

      if (type === "UNREAD_COUNT") {
        setUnreadCount(payload.count);
      }

      if (type === "MATCH_FOUND") {
        toast.success("OPPONENT FOUND!");
        router.push(`/room/${payload.roomCode}`);
      }

      // Raw WS events (not persisted notifications) — just need query invalidation
      if (type === "FRIEND_REMOVED") {
        qc.invalidateQueries({ queryKey: ["friends"] });
        toast("A friend removed you from their list", { icon: "👤" });
      }
      if (type === "FRIEND_REQUEST_DECLINED") {
        qc.invalidateQueries({ queryKey: ["friends"] });
        qc.invalidateQueries({ queryKey: ["friends", "pending"] });
      }
      if (type === "CHALLENGE_DECLINED" || type === "CHALLENGE_EXPIRED") {
        qc.invalidateQueries({ queryKey: ["challenges"] });
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, token]);
}

export function useMarkAllRead() {
  const { markAllRead } = useNotificationStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put("/api/notifications/read-all"),
    onSuccess: () => {
      markAllRead();
      qc.invalidateQueries({ queryKey: ["notifications", "count"] });
    },
  });
}

export function useMarkOneRead() {
  const { markRead } = useNotificationStore();
  return useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`),
    onSuccess: (_, id) => markRead(id),
  });
}