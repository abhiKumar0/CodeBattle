package com.codebattle.user;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class UserProfileDto {

    @Data
    @Builder
    public static class ProfileResponse {
        private String id;
        private String username;
        private String email;
        private int rating;
        private int wins;
        private int losses;
        private int xp;
        private int streak;
        private String role;
        private LocalDateTime createdAt;

        // Derived
        public int totalGames() { return wins + losses; }
        public double winRate() {
            int total = wins + losses;
            return total == 0 ? 0.0 : (double) wins / total * 100;
        }
    }
}
