package com.codebattle.challenge;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class ChallengeDto {


    @Data
    @Builder
    public static class ChallengeResponse {
        private String id;
        private String challengerId;
        private String challengerUsername;
        private String challengedId;
        private String challengedUsername;
        private String roomId;
        private String roomCode;
        private ChallengeStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
    }
}
