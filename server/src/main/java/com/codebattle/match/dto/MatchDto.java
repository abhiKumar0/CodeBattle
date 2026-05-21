package com.codebattle.match.dto;


import lombok.Builder;
import lombok.Data;

public class MatchDto {

    public enum MatchStatus {
        IDLE, // not in queue
        WAITING, // in queue, no opponent yet
        MATCHED // Opponent found, room created
    }


    @Data
    @Builder
    public static class MatchResponse {
        private MatchStatus status;
        private String roomId;
        private String roomCode;
        private String opponentUsername;
        private Integer opponentRating;
        private Integer queueSize;
        private String message;
    }
}
