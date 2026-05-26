"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Check, X, Swords } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { FriendResponse, ChallengeResponse } from "@/types";

export default function FriendsPage() {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState("");

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<FriendResponse[]>("/api/friends").then((r) => r.data),
  });
  const { data: pending = [] } = useQuery({
    queryKey: ["friends", "pending"],
    queryFn: () => api.get<FriendResponse[]>("/api/friends/pending").then((r) => r.data),
  });
  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => api.get<ChallengeResponse[]>("/api/challenges/my").then((r) => r.data),
  });

  const { mutate: sendRequest, isPending: sending } = useMutation({
    mutationFn: (userId: string) => api.post(`/api/friends/request/${userId}`).then((r) => r.data),
    onSuccess: () => { toast.success("Request sent!"); setTargetId(""); qc.invalidateQueries({ queryKey: ["friends"] }); },
    onError: () => toast.error("User not found"),
  });
  const { mutate: accept } = useMutation({
    mutationFn: (id: string) => api.put(`/api/friends/accept/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Friend added!"); qc.invalidateQueries({ queryKey: ["friends"] }); },
  });
  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => api.delete(`/api/friends/${id}`),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["friends"] }); },
  });
  const { mutate: challenge } = useMutation({
    mutationFn: (id: string) => api.post(`/api/challenges/send/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Challenge sent!"); qc.invalidateQueries({ queryKey: ["challenges"] }); },
    onError: () => toast.error("Failed to challenge"),
  });
  const { mutate: acceptChallenge } = useMutation({
    mutationFn: (id: string) => api.put(`/api/challenges/accept/${id}`).then((r) => r.data),
    onSuccess: (data: ChallengeResponse) => {
      toast.success("Challenge accepted!");
      if (data.roomCode) window.location.href = `/room/${data.roomCode}`;
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
  const { mutate: declineChallenge } = useMutation({
    mutationFn: (id: string) => api.put(`/api/challenges/decline/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges"] }),
  });

  const accepted = friends.filter((f) => f.status === "ACCEPTED");
  const incomingChallenges = challenges.filter((c) => c.status === "PENDING");

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="animate-fade-up">
        <p className="font-mono text-xs text-green-500 tracking-widest">// NETWORK</p>
        <h1 className="font-display text-4xl font-bold mt-1 flex items-center gap-3">
          <Users className="text-green-400" size={30} />
          ALLIES
        </h1>
      </div>

      {/* Add friend */}
      <div className="cb-card corner-tl p-5 animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
        <p className="font-mono text-xs text-muted-foreground tracking-widest mb-3">// ADD BY USER ID</p>
        <div className="flex gap-2">
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && targetId && sendRequest(targetId)}
            placeholder="USER ID..."
            className="cb-input" />
          <button onClick={() => targetId && sendRequest(targetId)} disabled={sending || !targetId}
            className="btn-primary flex items-center gap-1.5 shrink-0 px-4">
            <UserPlus size={12} /> SEND
          </button>
        </div>
      </div>

      {/* Incoming challenges */}
      {incomingChallenges.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-yellow-500 tracking-widest">// INCOMING CHALLENGES ({incomingChallenges.length})</p>
          {incomingChallenges.map((c) => (
            <div key={c.id} className="cb-card p-4 border-yellow-500/20 bg-yellow-500/3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold">{c.challengerUsername} <span className="text-yellow-400">challenged you!</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptChallenge(c.id)} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                    <Check size={11} /> ACCEPT
                  </button>
                  <button onClick={() => declineChallenge(c.id)} className="btn-secondary px-3 py-1.5 text-xs">
                    <X size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">// PENDING REQUESTS ({pending.length})</p>
          {pending.map((f) => (
            <div key={f.id} className="cb-card p-4 flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">{f.username}</p>
                <p className="font-mono text-xs text-muted-foreground">RATING: {f.rating}</p>
              </div>
              <button onClick={() => accept(f.userId)} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                <Check size={11} /> ACCEPT
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends */}
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground tracking-widest">// ALLIES ({accepted.length})</p>
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground animate-pulse">LOADING...</p>
        ) : accepted.length === 0 ? (
          <div className="cb-card p-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">NO ALLIES YET. RECRUIT SOMEONE.</p>
          </div>
        ) : (
          accepted.map((f) => (
            <div key={f.id} className="cb-card p-4 flex items-center justify-between group hover:border-green-500/30 transition-all">
              <div>
                <p className="font-display font-semibold group-hover:text-green-400 transition-colors">{f.username}</p>
                <p className="font-mono text-xs text-muted-foreground">⚡{f.rating}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => challenge(f.userId)}
                  className="font-mono text-xs flex items-center gap-1.5 px-3 py-1.5 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                  <Swords size={11} /> CHALLENGE
                </button>
                <button onClick={() => remove(f.userId)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
