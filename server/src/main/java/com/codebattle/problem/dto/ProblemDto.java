package com.codebattle.problem.dto;

import com.codebattle.problem.Difficulty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
 // DTO act as a SAFE structure
// ─── Request DTOs ────────────────────────────────────────────────────────────

public class ProblemDto {

    @Data
    @Builder
     // mainly for the admin when he created the problem
    public static class CreateRequest {
        private String title;
        private Difficulty difficulty;
        private String topic;
        private String tags; // Comma separated
        private String description;
        private String inputFormat;
        private String outputFormat;
        private String constraints;
        private String note;
        private String scoring;
        private int timeLimit;
        private int memoryLimit;
        private boolean isDaily;
        private List<TestCaseRequest> testCases;
    }

    @Data
    @Builder
    public static class TestCaseRequest {
        private String input;
        private String expectedOutput;
        private boolean isHidden;
    }

    // ─── Response DTOs ───────────────────────────────────────────────────────

    /** Full detail — includes visible test cases (for problem page) */
    @Data
    @Builder
    // prolbem details shown to the client side
    public static class DetailResponse {
        private String id;
        private String title;
        private Difficulty difficulty;
        private String topic;
        private List<String> tags;
        private String description;
        private String inputFormat;
        private String outputFormat;
        private String constraints;
        private String note;
        private String scoring;
        private int timeLimit;
        private int memoryLimit;
        private boolean isDaily;
        private LocalDateTime createdAt;
        private List<TestCaseResponse> sampleTestCases; // only visible ones
    }

    /** Lightweight card — for list / leaderboard views */
    @Data
    @Builder
    public static class SummaryResponse {
        private String id;
        private String title;
        private Difficulty difficulty;
        private String topic;
        private List<String> tags;
        private boolean isDaily;
    }

    @Data
    @Builder
    // to send viisble test case
    public static class TestCaseResponse {
        private String id;
        private String input;
        private String expectedOutput;
    }
}
