package com.codebattle.leaderboard;

import lombok.Builder;
import lombok.Data;

import java.util.List;

public class LeaderboardDto {

    @Data
    @Builder
    public static class Entry {
        private int rank;
        private String userId;
        private String username;
        private int score;      // rating for global, wins for weekly
    }

    @Data
    @Builder
    public static class LeaderboardResponse {
        private String type;    // "global" | "weekly" | "friends"
        private List<Entry> entries;
        private int total;
    }

    @Data
    @Builder
    public static class UserRank {
        private String userId;
        private Long globalRank;
        private Long weeklyRank;
        private int globalScore;
        private int weeklyScore;
    }
}
