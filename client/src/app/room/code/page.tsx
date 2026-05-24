"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { useRoomWebSocket, useReadyUp } from "@/hooks/useRoom";
import { useSubmit } from "@/hooks/useSubmission";
import { RoomResponse } from "@/types";
import { difficultyBg, statusColor } from "@/lib/utils";

// Lazy load Monaco — it's heavy
const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Loading editor...
    </div>
  ),
});

const LANGUAGE_OPTIONS = [
  { value: "java",       label: "Java" },
  { value: "python",     label: "Python 3" },
  { value: "cpp",        label: "C++" },
  { value: "javascript", label: "JavaScript" },
];

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const { userId } = useAuthStore();
  const {
    room, setRoom, selectedLanguage, setLanguage,
    code: editorCode, setCode, isSubmitting, opponentActivity,
  } = useRoomStore();

  const { data: roomData } = useQuery({
    queryKey: ["room", "code", code],
    queryFn: () =>
      api.get<RoomResponse>(`/api/rooms/code/${code}`).then((r) => r.data),
    enabled: !!code,
  });

  useEffect(() => {
    if (roomData) setRoom(roomData);
  }, [roomData]);

  useRoomWebSocket(room?.id ?? "");

  const { mutate: readyUp, isPending: readying } = useReadyUp(room?.id ?? "");
  const { mutate: submit } = useSubmit();

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }

  const isCreator  = room.creator.id === userId;
  const myReady    = isCreator ? room.creatorReady : room.opponentReady;
  const opponent   = isCreator ? room.opponent : room.creator;
  const problem    = room.problem;

  const handleSubmit = () => {
    if (!problem || !room) return;
    submit({
      roomId: room.id,
      problemId: problem.id,
      code: editorCode,
      language: selectedLanguage,
    });
  };

  // Waiting room
  if (room.status === "CREATED" || room.status === "WAITING") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm p-8 rounded-xl border border-border bg-card text-center space-y-6">
          <h2 className="text-xl font-bold">Room {room.code}</h2>
          <p className="text-muted-foreground text-sm">
            {room.status === "CREATED"
              ? "Share this code with your opponent"
              : "Waiting for both players to ready up"}
          </p>
          <div className="text-4xl font-mono tracking-widest font-bold text-primary">
            {room.code}
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>{room.creator.username}</span>
              <span className={room.creatorReady ? "text-green-500" : "text-muted-foreground"}>
                {room.creatorReady ? "✓ Ready" : "Not ready"}
              </span>
            </div>
            {room.opponent && (
              <div className="flex justify-between">
                <span>{room.opponent.username}</span>
                <span className={room.opponentReady ? "text-green-500" : "text-muted-foreground"}>
                  {room.opponentReady ? "✓ Ready" : "Not ready"}
                </span>
              </div>
            )}
          </div>
          {room.status === "WAITING" && !myReady && (
            <button
              onClick={() => readyUp()}
              disabled={readying}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {readying ? "..." : "Ready Up"}
            </button>
          )}
          {myReady && (
            <p className="text-green-500 text-sm font-medium">Waiting for opponent...</p>
          )}
        </div>
      </div>
    );
  }

  // Active match
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-primary">{room.code}</span>
          {problem && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm font-medium">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyBg(problem.difficulty as any)}`}>
                {problem.difficulty}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {opponent ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">vs</span>
              <span className="font-medium">{opponent.username}</span>
              {opponentActivity.isRunning && (
                <span className="text-xs text-blue-400 animate-pulse">running...</span>
              )}
              {opponentActivity.lastStatus && (
                <span className={`text-xs font-medium ${statusColor(opponentActivity.lastStatus)}`}>
                  {opponentActivity.lastStatus.replace(/_/g, " ")}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">No opponent</span>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-2/5 border-r border-border overflow-y-auto p-4 space-y-4 shrink-0">
          {problem ? (
            <>
              <div>
                <h2 className="text-lg font-bold">{problem.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Time: {problem.timeLimit}ms · Memory: {problem.memoryLimit}MB
                </p>
              </div>
              {/* Problem detail needs a fetch — placeholder for now */}
              <p className="text-sm text-muted-foreground">
                Fetching problem details...
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Loading problem...</p>
          )}
        </div>

        {/* Editor panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Language selector */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
            <select
              value={selectedLanguage}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="text-xs bg-muted border border-border rounded px-2 py-1 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Monaco */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={selectedLanguage}
              value={editorCode}
              onChange={(v) => setCode(v ?? "")}
            />
          </div>

          {/* Submit bar */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border bg-card shrink-0">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !editorCode.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
