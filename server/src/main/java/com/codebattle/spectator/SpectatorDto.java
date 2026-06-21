package com.codebattle.spectator;

import lombok.*;
import java.util.List;

public class SpectatorDto {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class JoinResponse {
        private String roomId;
        private String roomCode;
        private int spectatorCount;
        private List<SpectatorEntry> spectators;
        private PlayerSnapshot creator;
        private PlayerSnapshot opponent;
        private ProblemSnapshot problem;
        private String startedAt;
        private int duration;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SpectatorEntry {
        private String username;
        private String initial;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActiveRoomSummary {
        private String roomId;
        private String roomCode;
        private String creatorUsername;
        private int creatorRating;
        private String opponentUsername;
        private int opponentRating;
        private String problemTitle;
        private String difficulty;
        private String startedAt;
        private int duration;
        private int spectatorCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PlayerSnapshot {
        private String id;
        private String username;
        private int rating;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProblemSnapshot {
        private String id;
        private String title;
        private String difficulty;
        private int timeLimit;
        private int memoryLimit;
    }

    // ── Received from room page players via STOMP @MessageMapping ─────────────
    // Client sends to: /app/spectate/{roomId}/code
    // Server rebroadcasts to: /topic/spectate/{roomId}
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CodeUpdatePayload {
        private String code;
        private String language;
        private String username;
    }
}