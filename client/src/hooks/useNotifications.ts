import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "@/lib/api";
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

// ── Singleton STOMP client — lives outside React, never killed on re-render ───
let globalStompClient: Client | null = null;
let isConnecting = false;

function connectOnce(
  token: string,
  onMessage: (type: string, payload: any) => void
): void {
  if (globalStompClient?.active || isConnecting) return;
  isConnecting = true;

  const client = new Client({
    webSocketFactory: () =>
      new SockJS(process.env.NEXT_PUBLIC_WS_URL as string),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      console.log("✅ WS connected — notification subscription active");
      isConnecting = false;
      client.subscribe("/user/queue/notifications", (msg) => {
        try {
          const { type, payload } = JSON.parse(msg.body);
          onMessage(type, payload);
        } catch (e) {
          console.error("Notification parse error:", e);
        }
      });
    },
    onDisconnect: () => { isConnecting = false; },
    onStompError: (f) => { console.error("STOMP:", f); isConnecting = false; },
  });

  globalStompClient = client;
  client.activate();
}

export function disconnectGlobalStomp() {
  globalStompClient?.deactivate();
  globalStompClient = null;
  isConnecting = false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const { token, isAuthenticated } = useAuthStore();
  const { setNotifications, prependNotification, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const qc = useQueryClient();

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

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    connectOnce(token, (type, payload) => {
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
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
      if (type === "UNREAD_COUNT") setUnreadCount(payload.count);
      if (type === "MATCH_FOUND") {
        toast.success("OPPONENT FOUND!");
        router.push(`/room/${payload.roomCode}`);
      }
    });
    // No cleanup — singleton must persist across re-renders
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