
package com.codebattle.notification;

import lombok.*;
import java.time.LocalDateTime;

public class NotificationDto {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NotifResponse {
        private String id;
        private String type;
        private String title;
        private String body;
        private String actionUrl;
        private String actorUsername;
        private String actorInitial;
        private boolean read;
        private LocalDateTime createdAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CountResponse {
        private long unread;
    }
}
