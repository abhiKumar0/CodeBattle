"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Check, X, Swords, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { FriendResponse, ChallengeResponse, UserSearchResult } from "@/types";
import { useAuthStore } from "@/store/authStore";

export default function FriendsPage() {
  const qc = useQueryClient();
  const { userId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Username prefix search ─────────────────────────────────────────────────
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["users", "search", searchQuery],
    queryFn: () =>
      api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.data),
    enabled: searchQuery.trim().length >= 2 && !selectedUser,
    staleTime: 1000 * 5,
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Data queries ───────────────────────────────────────────────────────────
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

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: sendRequest, isPending: sending } = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/friends/request/${userId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Friend request sent!");
      setSearchQuery("");
      setSelectedUser(null);
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => toast.error("Request failed or already sent"),
  });

  const { mutate: accept } = useMutation({
    mutationFn: (id: string) => api.put(`/api/friends/accept/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Friend added!"); qc.invalidateQueries({ queryKey: ["friends"] }); },
  });

  const { mutate: decline } = useMutation({
    mutationFn: (id: string) => api.delete(`/api/friends/decline/${id}`),
    onSuccess: () => { toast.success("Request declined"); qc.invalidateQueries({ queryKey: ["friends"] }); },
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
  const incomingChallenges = challenges.filter(
    (c) => c.status === "PENDING" && c.challengedId === userId
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        {/* <p className="font-mono text-xs text-green-500 tracking-widest">// NETWORK</p> */}
        <h1 className="font-display text-4xl font-bold mt-1 flex items-center gap-3">
          <Users className="text-green-400" size={30} />
          ALLIES
        </h1>
      </div>

      {/* ── Search by username ── */}
      <div className="cb-card corner-tl p-5 animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />


        <div className="relative" ref={searchRef}>
          {/* Input row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);

                  if (selectedUser) {
                    setSelectedUser(null);
                  }

                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Type username..."
                className="
                  cb-input
                  w-full
                  h-12
                  !pl-14
                  !pr-10
                  leading-none
"
              />
              {/* Clear selected */}
              {(searchQuery || selectedUser) && (
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery("");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-400 z-10"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => selectedUser && sendRequest(selectedUser.id)}
              disabled={sending || !selectedUser}
              className="btn-primary flex items-center gap-1.5 shrink-0 px-4">
              <UserPlus size={12} /> SEND
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && searchQuery.length >= 2 && !selectedUser && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
              {searching ? (
                <div className="px-4 py-3 font-mono text-xs text-muted-foreground animate-pulse">
                  SEARCHING...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  NO USERS FOUND
                </div>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-500/8 transition-colors border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border border-green-500/30 flex items-center justify-center font-mono text-xs text-green-400">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-display font-semibold text-sm">{u.username}</span>
                    </div>
                    <span className="font-mono text-xs text-green-400">⚡{u.rating}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected user preview */}
        {selectedUser && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 border border-green-500/20 bg-green-500/5">
            <div className="w-7 h-7 border border-green-500/40 flex items-center justify-center font-mono text-xs text-green-400">
              {selectedUser.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-display font-semibold text-sm">{selectedUser.username}</p>
              <p className="font-mono text-xs text-muted-foreground">⚡{selectedUser.rating}</p>
            </div>
            <span className="ml-auto font-mono text-xs text-green-500">SELECTED ✓</span>
          </div>
        )}

        <p className="font-mono text-xs text-muted-foreground/50 mt-2">
          Type at least 2 characters to search
        </p>
      </div>

      {/* Incoming challenges */}
      {incomingChallenges.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-yellow-500 tracking-widest">
            // INCOMING CHALLENGES ({incomingChallenges.length})
          </p>
          {incomingChallenges.map((c) => (
            <div key={c.id} className="cb-card p-4 border-yellow-500/20 bg-yellow-500/3">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold">
                  {c.challengerUsername}{" "}
                  <span className="text-yellow-400">challenged you!</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => acceptChallenge(c.id)}
                    className="btn-primary btn-sm flex items-center gap-1 px-3 py-1.5 text-xs">
                    <Check size={11} /> ACCEPT
                  </button>
                  <button onClick={() => declineChallenge(c.id)}
                    className="btn-secondary px-2 py-1.5">
                    <X size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending friend requests */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            // PENDING REQUESTS ({pending.length})
          </p>
          {pending.map((f) => (
            <div key={f.id} className="cb-card p-4 flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">{f.username}</p>
                <p className="font-mono text-xs text-muted-foreground">⚡{f.rating}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => accept(f.userId)}
                  className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs">
                  <Check size={11} /> ACCEPT
                </button>
                <button onClick={() => decline(f.userId)}
                  className="btn-secondary px-2 py-1.5">
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground tracking-widest">
          // ALLIES ({accepted.length})
        </p>
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground animate-pulse">LOADING...</p>
        ) : accepted.length === 0 ? (
          <div className="cb-card p-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              NO ALLIES YET. SEARCH FOR SOMEONE ABOVE.
            </p>
          </div>
        ) : (
          accepted.map((f) => (
            <div key={f.id}
              className="cb-card p-4 flex items-center justify-between group hover:border-green-500/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-green-500/30 flex items-center justify-center font-mono text-xs text-green-400">
                  {f.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-semibold group-hover:text-green-400 transition-colors">
                    {f.username}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">⚡{f.rating}</p>
                </div>
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
