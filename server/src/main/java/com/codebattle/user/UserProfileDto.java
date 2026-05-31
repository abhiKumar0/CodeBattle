package com.codebattle.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class UserProfileDto {

    @Data
    @Builder
    public static class ProfileResponse {
        private String id;
        private String username;
        private String displayName;
        private String email;
        private int rating;
        private int wins;
        private int losses;
        private int xp;
        private int streak;
        private String role;
        private String bio;
        private String profilePictureUrl;
        private LocalDateTime createdAt;
        private LocalDateTime lastUsernameChangeAt;

        // Derived
        public int totalGames() { return wins + losses; }
        public double winRate() {
            int total = wins + losses;
            return total == 0 ? 0.0 : (double) wins / total * 100;
        }
    }

    @Data
    public static class UpdateRequest {
        @Size(min = 3, max = 20, message = "Username must be 3-20 characters")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers and underscores")
        private String username;

        @Size(min = 1, max = 30, message = "Display name must be 1-30 characters")
        private String displayName;

        @Size(max = 200, message = "Bio must be 200 characters or less")
        private String bio;
    }
}
