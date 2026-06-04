"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Pencil, Calendar, Swords, Trophy, Award } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useMyRank } from "@/hooks/useLeaderboard";
import { UserProfile, AchievementsListResponse } from "@/types";
import AvatarUpload from "@/components/profile/AvatarUpload";
import EditProfileModal from "@/components/profile/EditProfileModal";
import BattleHistoryList from "@/components/profile/BattleHistoryList";

type Tab = "history" | "achievements";

export default function ProfilePage() {
  const { userId } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("history");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<UserProfile>("/api/users/me").then((r) => r.data),
    enabled: !!userId,
  });
  const { data: rank } = useMyRank();
  const { data: achievements } = useQuery({
    queryKey: ["achievements", "my"],
    queryFn: () => api.get<AchievementsListResponse>("/api/achievements/my").then((r) => r.data),
  });

  const winRate = profile && profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) : 0;

  if (isLoading) return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <div className="font-mono text-xs text-green-500 animate-pulse tracking-widest">LOADING OPERATOR DATA...</div>
    </div>
  );
  if (!profile) return null;

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* ═══ Profile Header ═══ */}
      <div className="cb-card corner-tl p-6 relative animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <AvatarUpload
            profilePictureUrl={profile.profilePictureUrl}
            username={profile.username}
            editable
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold text-green-400">
                {profile.displayName || profile.username}
              </h1>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 text-muted-foreground hover:text-green-400 transition-colors border border-green-500/20 rounded hover:border-green-500/40"
                title="Edit profile"
              >
                <Pencil size={12} />
              </button>
            </div>

            <p className="font-mono text-xs text-muted-foreground/60 mt-1">@{profile.username}</p>

            {profile.bio && (
              <p className="font-mono text-xs text-muted-foreground/80 mt-2 leading-relaxed max-w-md">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="font-mono text-xs border border-green-500/30 px-2 py-1 text-green-400">
                ⚡ {profile.rating} ELO
              </span>
              {rank?.globalRank && (
                <span className="font-mono text-xs border border-cyan-500/30 px-2 py-1 text-cyan-400">
                  🏆 #{rank.globalRank} Global
                </span>
              )}
              <span className="font-mono text-xs text-muted-foreground/50 flex items-center gap-1">
                <Calendar size={10} />
                {memberSince}
              </span>
            </div>

            <p className="font-mono text-xs text-muted-foreground/40 mt-2">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* ═══ Stats Grid ═══ */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 animate-fade-up">
        {[
          { label: "WINS",     value: profile.wins,                  color: "text-green-400" },
          { label: "LOSSES",   value: profile.losses,                color: "text-red-400" },
          { label: "WIN RATE", value: `${winRate}%`,                 color: "text-cyan-400" },
          { label: "STREAK",   value: `${profile.streak}🔥`,        color: "text-orange-400" },
          { label: "XP",       value: profile.xp,                    color: "text-yellow-400" },
          { label: "GLOBAL",   value: rank?.globalRank ? `#${rank.globalRank}` : "—", color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="cb-card p-4 text-center">
            <p className="font-mono text-xs text-muted-foreground tracking-wider mb-2">{label}</p>
            <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex items-center gap-1 border-b border-green-500/15 animate-fade-up">
        {([
          { key: "history" as Tab,      label: "BATTLE HISTORY", icon: Swords },
          { key: "achievements" as Tab, label: "ACHIEVEMENTS",   icon: Award },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs font-medium tracking-wider transition-all border-b-2 ${
              activeTab === key
                ? "text-green-400 border-green-500"
                : "text-muted-foreground border-transparent hover:text-green-400/70 hover:border-green-500/30"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Tab Content ═══ */}
      <div className="animate-fade-up">
        {activeTab === "history" && <BattleHistoryList />}

        {activeTab === "achievements" && (
          <>
            {achievements && achievements.unlocked.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-muted-foreground tracking-widest">
                    {achievements.unlocked.length} UNLOCKED
                  </p>
                  <p className="font-mono text-xs text-green-500">
                    {achievements.totalXpFromAchievements} XP earned
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {achievements.unlocked.map((a) => (
                    <div key={a.id} className="cb-card p-4 flex items-start gap-3 hover:border-green-500/30 transition-all">
                      <div className="text-2xl shrink-0">🏅</div>
                      <div>
                        <p className="font-display font-semibold text-sm">{a.title}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{a.description}</p>
                        <p className="font-mono text-xs text-green-500 mt-1">+{a.xpReward} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="cb-card p-8 text-center">
                <Trophy size={40} className="text-green-500/20 mx-auto mb-3" />
                <p className="font-display text-lg text-muted-foreground">No achievements yet</p>
                <p className="font-mono text-xs text-muted-foreground/60 mt-1">
                  Keep battling to unlock rewards
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Edit Modal ═══ */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
