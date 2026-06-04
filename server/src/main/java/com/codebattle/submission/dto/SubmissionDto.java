package com.codebattle.submission.dto;

import com.codebattle.submission.SubmissionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class SubmissionDto {

// Request
    @Data
    @Builder
    // content send by the client to the server  
    public static class SubmitRequest {
        private String roomId;
        private String problemId;
        private String code;
        private String language;  // "java", "python", "cpp", "javascript"
    }

    // ─── Responses 
    @Data
    @Builder
    // server response to the client  
    public static class SubmissionResponse {
        private String id;
        private String roomId;
        private String userId;
        private String username;
        private String problemId;
        private String language;
        private SubmissionStatus status;
        private Integer executionTime;
        private Integer memoryUsed;
        private String errorMessage;
        private LocalDateTime submittedAt;
    }

    // ─── WebSocket event payload 
    @Data
    @Builder
    // for real time updates  
    // it is  use dto dislpay changs on screen withput refreshing  
    public static class SubmissionEvent {
        private String type;           // SUBMISSION_RUNNING | SUBMISSION_RESULT
        private String submissionId;
        private String userId;
        private String username;
        private SubmissionStatus status;
        private Integer executionTime;
        private Integer memoryUsed;
        private String errorMessage;
    }
}
