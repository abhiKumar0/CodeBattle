import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient: Client | null = null;

export function getStompClient(): Client {
  if (stompClient) return stompClient;

  stompClient = new Client({
    webSocketFactory: () =>
      new SockJS(process.env.NEXT_PUBLIC_WS_URL as string),
    reconnectDelay: 5000,
    onStompError: (frame) => {
      console.error("STOMP error:", frame);
    },
  });

  return stompClient;
}

export function connectStomp(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = getStompClient();

    client.connectHeaders = { Authorization: `Bearer ${token}` };

    client.onConnect = () => resolve();
    client.onStompError = (frame) => reject(frame);

    if (!client.active) client.activate();
    else resolve(); // already connected
  });
}

export function disconnectStomp(): void {
  stompClient?.deactivate();
  stompClient = null;
}

export function subscribeToRoom(
  roomId: string,
  callback: (body: unknown) => void
): StompSubscription | null {
  const client = getStompClient();
  if (!client.active) return null;
  return client.subscribe(`/topic/room/${roomId}`, (msg) => {
    callback(JSON.parse(msg.body));
  });
}

export function subscribeToMatch(
  roomId: string,
  callback: (body: unknown) => void
): StompSubscription | null {
  const client = getStompClient();
  if (!client.active) return null;
  return client.subscribe(`/topic/match/${roomId}`, (msg) => {
    callback(JSON.parse(msg.body));
  });
}

export function subscribeToNotifications(
  callback: (body: unknown) => void
): StompSubscription | null {
  const client = getStompClient();
  if (!client.active) return null;
  return client.subscribe(`/user/queue/notifications`, (msg) => {
    callback(JSON.parse(msg.body));
  });
}

export function sendPing(roomId: string): void {
  const client = getStompClient();
  if (client.active) client.publish({ destination: `/app/room/${roomId}/ping` });
}

export function sendTyping(roomId: string, language: string): void {
  const client = getStompClient();
  if (client.active)
    client.publish({
      destination: `/app/room/${roomId}/typing`,
      body: JSON.stringify({ language }),
    });
}
