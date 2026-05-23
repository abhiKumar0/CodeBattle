package com.codebattle.friend;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class FriendDto {


    @Data
    @Builder
    public static class FriendResponse {
        private String id;
        private String userId;
        private String username;
        private int rating;
        private FriendStatus status;
        private LocalDateTime createdAt;
    }
}
