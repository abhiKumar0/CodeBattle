import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { LeaderboardResponse, UserRank } from "@/types";
import { useAuthStore } from "@/store/authStore";

export function useGlobalLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "global"],
    queryFn: () => api.get<LeaderboardResponse>("/api/leaderboard/global").then((r) => r.data),
    staleTime: 1000 * 30,
  });
}

export function useWeeklyLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "weekly"],
    queryFn: () => api.get<LeaderboardResponse>("/api/leaderboard/weekly").then((r) => r.data),
    staleTime: 1000 * 30,
  });
}

export function useFriendsLeaderboard() {
  const { userId } = useAuthStore();
  return useQuery({
    queryKey: ["leaderboard", "friends"],
    queryFn: () =>
      api.get<LeaderboardResponse>(`/api/leaderboard/friends/${userId}`).then((r) => r.data),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

export function useMyRank() {
  return useQuery({
    queryKey: ["leaderboard", "rank"],
    queryFn: () => api.get<UserRank>("/api/leaderboard/rank").then((r) => r.data),
  });
}
