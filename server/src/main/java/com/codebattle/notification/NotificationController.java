package com.codebattle.notification;

import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtUtil             jwtUtil;

    // ─── DEBUG: test WS delivery from Postman ─────────────────────────────────
    // POST /api/notifications/debug/test-ws
    // Hit this from Postman with your Bearer token.
    // If the browser shows a toast → WS works. If not → the message was eaten.
    // REMOVE THIS IN PRODUCTION.
    @PostMapping("/debug/test-ws")
    public ResponseEntity<Map<String, String>> debugTestWs(
            @RequestHeader("Authorization") String auth) {
        String userId = extractId(auth);

        // This goes through the exact same save() → sendToUser() pipeline
        // that friend requests, challenges, and match results use.
        notificationService.sendToUser(userId, "NEW_NOTIFICATION",
                Map.of(
                    "id",    "debug-" + System.currentTimeMillis(),
                    "type",  "SYSTEM",
                    "title", "🧪 Debug: WS is working!",
                    "body",  "If you see this toast, real-time notifications are connected.",
                    "read",  false,
                    "createdAt", java.time.LocalDateTime.now().toString()
                ));

        return ResponseEntity.ok(Map.of(
                "status", "sent",
                "userId", userId,
                "message", "Check your browser for the toast notification"
        ));
    }

    /** GET /api/notifications — latest 30 notifications */
    @GetMapping
    public ResponseEntity<List<NotificationDto.NotifResponse>> getAll(
            @RequestHeader("Authorization") String auth) {
        String userId = extractId(auth);
        return ResponseEntity.ok(notificationService.getForUser(userId));
    }

    /** GET /api/notifications/unread-count */
    @GetMapping("/unread-count")
    public ResponseEntity<NotificationDto.CountResponse> unreadCount(
            @RequestHeader("Authorization") String auth) {
        String userId = extractId(auth);
        return ResponseEntity.ok(new NotificationDto.CountResponse(
                notificationService.getUnreadCount(userId)));
    }

    /** PUT /api/notifications/read-all — mark all as read */
    @PutMapping("/read-all")
    public ResponseEntity<Void> readAll(
            @RequestHeader("Authorization") String auth) {
        notificationService.markAllRead(extractId(auth));
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/notifications/{id}/read — mark single as read */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> readOne(
            @RequestHeader("Authorization") String auth,
            @PathVariable String id) {
        notificationService.markOneRead(id, extractId(auth));
        return ResponseEntity.noContent().build();
    }

    private String extractId(String auth) {
        return jwtUtil.extractUserId(auth.replace("Bearer ", "").trim());
    }
}
