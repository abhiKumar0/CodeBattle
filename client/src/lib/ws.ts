import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// ── ONE global STOMP client for the entire app ───────────────────────────────
let stompClient: Client | null = null;
let isConnecting = false;
let notifSub: StompSubscription | null = null;

// Listeners registered via onNotification()
type NotifListener = (type: string, payload: any) => void;
const notifListeners = new Set<NotifListener>();

/**
 * Connect once. Safe to call many times — only the first call connects.
 * Subscribes to /user/queue/notifications automatically and fans out
 * to all registered listeners.
 */
export function connectStomp(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stompClient?.active) {
      resolve();
      return;
    }
    if (isConnecting) {
      // Wait for the existing connection attempt
      const check = setInterval(() => {
        if (stompClient?.active) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject("WS connect timeout"); }, 10000);
      return;
    }

    isConnecting = true;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(process.env.NEXT_PUBLIC_WS_URL as string),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      debug: (str) => {
        if (str.includes("CONNECT") || str.includes("ERROR")) {
          console.log("📡 STOMP:", str);
        }
      },
      onConnect: () => {
        console.log("✅ STOMP connected");
        isConnecting = false;

        // Subscribe to user notifications ONCE on the single connection
        if (!notifSub) {
          notifSub = client.subscribe("/user/queue/notifications", (msg) => {
            try {
              const data = JSON.parse(msg.body);
              const { type, payload } = data;
              console.log("📩 WS notification:", type, payload);
              // Fan out to all registered listeners
              notifListeners.forEach((fn) => fn(type, payload));
            } catch (e) {
              console.error("WS parse error:", e);
            }
          });
        }

        resolve();
      },
      onDisconnect: () => {
        console.log("❌ STOMP disconnected");
        isConnecting = false;
        notifSub = null;
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        isConnecting = false;
        reject(frame);
      },
    });

    stompClient = client;
    client.activate();
  });
}

/**
 * Disconnect and clean up everything.
 */
export function disconnectStomp(): void {
  notifSub?.unsubscribe();
  notifSub = null;
  notifListeners.clear();
  stompClient?.deactivate();
  stompClient = null;
  isConnecting = false;
}

/**
 * Register a listener for /user/queue/notifications.
 * Returns an unsubscribe function.
 * The listener receives (type, payload) for every WS notification.
 */
export function onNotification(listener: NotifListener): () => void {
  notifListeners.add(listener);
  return () => { notifListeners.delete(listener); };
}

// ── Room-specific subscriptions (topic channels) ─────────────────────────────

export function subscribeToRoom(roomId: string, cb: (body: unknown) => void): StompSubscription | null {
  if (!stompClient?.active) return null;
  return stompClient.subscribe(`/topic/room/${roomId}`, (msg) => cb(JSON.parse(msg.body)));
}

export function subscribeToMatch(roomId: string, cb: (body: unknown) => void): StompSubscription | null {
  if (!stompClient?.active) return null;
  return stompClient.subscribe(`/topic/match/${roomId}`, (msg) => cb(JSON.parse(msg.body)));
}

export function sendPing(roomId: string): void {
  if (stompClient?.active) stompClient.publish({ destination: `/app/room/${roomId}/ping` });
}

export function sendTyping(roomId: string, language: string): void {
  if (stompClient?.active)
    stompClient.publish({ destination: `/app/room/${roomId}/typing`, body: JSON.stringify({ language }) });
}

/**
 * Get the raw STOMP client — only for advanced subscriptions (e.g., spectator).
 */
export function getStompClient(): Client | null {
  return stompClient;
}
