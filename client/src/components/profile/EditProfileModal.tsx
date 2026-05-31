"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle, Clock } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { UserProfile, ProfileUpdateRequest } from "@/types";

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
}

export default function EditProfileModal({ profile, onClose }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const { updateProfile: updateStore } = useAuthStore();

  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [error, setError] = useState<string | null>(null);

  // Username cooldown logic
  const usernameCooldown = useMemo(() => {
    if (!profile.lastUsernameChangeAt) return { locked: false, daysLeft: 0 };
    const lastChange = new Date(profile.lastUsernameChangeAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = 30 - daysSince;
    return { locked: daysLeft > 0, daysLeft: Math.max(0, daysLeft) };
  }, [profile.lastUsernameChangeAt]);

  const usernameChanged = username !== profile.username;

  const mutation = useMutation({
    mutationFn: (data: ProfileUpdateRequest) =>
      api.put<UserProfile>("/api/users/me", data).then((r) => r.data),
    onSuccess: (data) => {
      updateStore({
        username: data.username,
        profilePictureUrl: data.profilePictureUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.detail || "Update failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const updates: ProfileUpdateRequest = {};
    if (usernameChanged) updates.username = username;
    if (displayName !== (profile.displayName || "")) updates.displayName = displayName;
    if (bio !== (profile.bio || "")) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative cb-card corner-tl w-full max-w-md p-6 animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-green-400">// EDIT PROFILE</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-green-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-red-500/30 bg-red-500/5 rounded text-red-400 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name — freely editable */}
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-wider block mb-1.5">
              DISPLAY NAME
            </label>
            <input
              type="text"
              className="cb-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
              placeholder={profile.username}
              maxLength={30}
            />
            <p className="font-mono text-[10px] text-muted-foreground/50 mt-1">
              Shown in battles and leaderboards. Leave empty to use your username.
            </p>
          </div>

          {/* Username — 30-day cooldown */}
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-wider block mb-1.5">
              USERNAME
              {usernameCooldown.locked && (
                <span className="text-yellow-500/80 ml-2 inline-flex items-center gap-1">
                  <Clock size={10} /> {usernameCooldown.daysLeft}d cooldown
                </span>
              )}
            </label>
            <input
              type="text"
              className={`cb-input ${usernameCooldown.locked ? "opacity-50" : ""}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              pattern="^[a-zA-Z0-9_]+$"
              title="Letters, numbers and underscores only"
              disabled={usernameCooldown.locked}
              required
            />
            {usernameCooldown.locked && (
              <p className="font-mono text-[10px] text-yellow-500/60 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                Can be changed again in {usernameCooldown.daysLeft} day(s)
              </p>
            )}
            {!usernameCooldown.locked && (
              <p className="font-mono text-[10px] text-muted-foreground/50 mt-1">
                Can only be changed once every 30 days
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-wider block mb-1.5">
              BIO <span className="text-green-500/40">({bio.length}/200)</span>
            </label>
            <textarea
              className="cb-input resize-none"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Tell the arena about yourself..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
