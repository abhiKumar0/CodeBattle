"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "@/store/notificationStore";
import { useMarkAllRead, useMarkOneRead, NOTIF_ICON } from "@/hooks/useNotifications";

export default function NotificationPanel() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, panelOpen, togglePanel, closePanel } =
    useNotificationStore();
  const { mutate: markAll } = useMarkAllRead();
  const { mutate: markOne } = useMarkOneRead();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: { id: string; read: boolean; actionUrl?: string }) => {
    if (!n.read) markOne(n.id);
    closePanel();
    if (n.actionUrl) router.push(n.actionUrl);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={togglePanel}
        className="relative p-1.5 text-muted-foreground hover:text-green-400 transition-colors"
        title="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 text-background rounded-full flex items-center justify-center font-mono text-[9px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {panelOpen && (
        <div className="absolute right-0 top-9 w-80 z-50 border border-border bg-card shadow-2xl"
          style={{ boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(34,197,94,0.06)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-foreground">
                NOTIFICATIONS
              </span>
              {unreadCount > 0 && (
                <span className="font-mono text-xs text-green-500">
                  ({unreadCount} new)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll()}
                  className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-green-400 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck size={12} /> All read
                </button>
              )}
              <button onClick={closePanel}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-mono text-xs text-muted-foreground tracking-widest">
                  NO NOTIFICATIONS YET
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-green-500/4 ${
                    !n.read ? "bg-green-500/3" : ""
                  }`}
                >
                  {/* Icon / Avatar */}
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center text-base ${
                    !n.read ? "border border-green-500/30" : "border border-border"
                  }`}>
                    {n.actorInitial
                      ? <span className="font-mono text-xs font-bold text-green-400">
                          {n.actorInitial}
                        </span>
                      : <span>{NOTIF_ICON[n.type] ?? "🔔"}</span>
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${
                      !n.read ? "text-foreground" : "text-foreground/70"
                    }`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="font-mono text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="font-mono text-xs text-muted-foreground/50 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border text-center">
              <span className="font-mono text-xs text-muted-foreground/50 tracking-widest">
                LAST 30 NOTIFICATIONS
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
