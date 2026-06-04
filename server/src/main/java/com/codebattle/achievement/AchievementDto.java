package com.codebattle.achievement;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public class AchievementDto {


    @Data
    @Builder
    public static class AchievementResponse {
        private String id;
        private AchievementType type;
        private String title;
        private String description;
        private int xpReward;
        private LocalDateTime unlockedAt;
    }

    @Data
    @Builder
    public static class AchievementsListResponse {
        private List<AchievementResponse> unlocked;
        private int totalXpFromAchievements;
    }
}
