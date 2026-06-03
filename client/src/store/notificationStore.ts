import { create } from "zustand";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  actorUsername?: string;
  actorInitial?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  panelOpen: boolean;
  setNotifications: (n: AppNotification[]) => void;
  prependNotification: (n: AppNotification) => void;
  setUnreadCount: (c: number | ((prev: number) => number)) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  togglePanel: () => void;
  closePanel: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  panelOpen: false,

  setNotifications: (notifications) => set({ notifications }),

  prependNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 50),
    })),

  // Accepts both a number and an updater function
  setUnreadCount: (c) =>
    set((s) => ({
      unreadCount: typeof c === "function" ? c(s.unreadCount) : c,
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
}));