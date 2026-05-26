// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  rating: number;
  role: string;
}
export interface RegisterRequest { username: string; email: string; password: string; }
export interface LoginRequest { email: string; password: string; }

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string; username: string; email: string; rating: number;
  wins: number; losses: number; xp: number; streak: number;
  role: string; createdAt: string;
}

// ─── Problem ──────────────────────────────────────────────────────────────────
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export interface ProblemSummary {
  id: string; title: string; difficulty: Difficulty; topic: string; isDaily: boolean;
}
export interface TestCase { id: string; input: string; expectedOutput: string; }
export interface ProblemDetail {
  id: string; title: string; difficulty: Difficulty; description: string;
  inputFormat: string; outputFormat: string; constraints: string;
  timeLimit: number; memoryLimit: number; isDaily: boolean;
  topic: string; createdAt: string; sampleTestCases: TestCase[];
}

// ─── Room ─────────────────────────────────────────────────────────────────────
export type RoomStatus = "CREATED" | "WAITING" | "ACTIVE" | "FINISHED" | "EXPIRED";
export interface PlayerInfo { id: string; username: string; rating: number; ready: boolean; }
export interface ProblemInfo { id: string; title: string; difficulty: string; timeLimit: number; memoryLimit: number; }
export interface RoomResponse {
  id: string; code: string; status: RoomStatus;
  creator: PlayerInfo; opponent: PlayerInfo | null;
  problem: ProblemInfo | null; duration: number;
  creatorReady: boolean; opponentReady: boolean;
  createdAt: string; startedAt: string | null;
  endedAt: string | null; winnerId: string | null;
}

// ─── Submission ───────────────────────────────────────────────────────────────
export type SubmissionStatus =
  | "PENDING" | "RUNNING" | "ACCEPTED" | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED" | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR" | "COMPILE_ERROR";
export type Language = "java" | "python" | "cpp" | "javascript" | "c";
export interface SubmissionResponse {
  id: string; roomId: string; userId: string; username: string;
  problemId: string; language: Language; status: SubmissionStatus;
  executionTime: number | null; memoryUsed: number | null;
  errorMessage: string | null; submittedAt: string;
}

// ─── Match ────────────────────────────────────────────────────────────────────
export type MatchStatus = "IDLE" | "WAITING" | "MATCHED";
export interface MatchResponse {
  status: MatchStatus; roomId: string | null; roomCode: string | null;
  opponentUsername: string | null; opponentRating: number | null;
  queueSize: number | null; message: string;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry { rank: number; userId: string; username: string; score: number; }
export interface LeaderboardResponse { type: string; entries: LeaderboardEntry[]; total: number; }
export interface UserRank {
  userId: string; globalRank: number | null; weeklyRank: number | null;
  globalScore: number; weeklyScore: number;
}

// ─── Achievement ──────────────────────────────────────────────────────────────
export interface AchievementResponse {
  id: string; type: string; title: string; description: string;
  xpReward: number; unlockedAt: string;
}
export interface AchievementsListResponse {
  unlocked: AchievementResponse[]; totalXpFromAchievements: number;
}

// ─── Friend ───────────────────────────────────────────────────────────────────
export type FriendStatus = "PENDING" | "ACCEPTED" | "BLOCKED";
export interface FriendResponse {
  id: string; userId: string; username: string; rating: number;
  status: FriendStatus; createdAt: string;
}

// ─── Challenge ────────────────────────────────────────────────────────────────
export type ChallengeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
export interface ChallengeResponse {
  id: string; challengerId: string; challengerUsername: string;
  challengedId: string; challengedUsername: string;
  status: ChallengeStatus; roomCode: string | null; createdAt: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────
export interface RoomEvent {
  type: "OPPONENT_JOINED" | "PLAYER_READY" | "MATCH_STARTED" | "MATCH_ENDED" | "PONG" | "TYPING";
  payload: unknown;
}
export interface SubmissionEvent {
  type: "SUBMISSION_RUNNING" | "SUBMISSION_RESULT";
  submissionId: string; userId: string; username: string;
  status: SubmissionStatus; executionTime: number | null;
  memoryUsed: number | null; errorMessage: string | null;
}
export interface Notification {
  type: "MATCH_FOUND" | "MATCH_RESULT" | "CHALLENGE_RECEIVED" | "CHALLENGE_DECLINED"
      | "CHALLENGE_EXPIRED" | "FRIEND_ACCEPTED" | "ACHIEVEMENT_UNLOCKED";
  payload: Record<string, unknown>;
}
