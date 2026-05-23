package com.codebattle.notification;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate simpMessagingTemplate;



    /**
     * Send to a specific user by their username (the STOMP principal name).
     */
    public void sendToUser(String username, String type, Object payload) {
        simpMessagingTemplate.convertAndSendToUser(
                username,
                "/queue/notification",
                Map.of("type", type, "payload", payload)
        );

        log.debug("Notification sent to {}: {}", username, type);
    }

    // ─── Convenience methods for common notification types ────────────────────

    public void notifyMatchFound(String username, String roomId, String roomCode) {
        sendToUser(username, "MATCH_FOUND", Map.of(
                "roomId", roomId,
                "roomCode", roomCode
        ));
    }

    public void notifyOpponentJoined(String username, String opName, int opRating) {
        sendToUser(username, "OPPONENT_JOINED", Map.of(
                "username", opName,
                "rating", opRating
        ));
    }

    public void notifyMatchResult(String username, boolean won, int ratingChange, int newRating) {
        sendToUser(username, "MATCH_RESULT", Map.of(
                "won", won,
                "ratingChange", ratingChange,
                "newRating", newRating
        ));
    }

    public void notifyChallengeReceived(String username, String challengerId,
                                        String challengerName, String challengeId) {
        sendToUser(username, "CHALLENGE_RECEIVED", Map.of(
                "challengeId",    challengeId,
                "challengerId",   challengerId,
                "challengerName", challengerName
        ));
    }

    public void notifyFriendRequestReceived(String username, String requesterId,
                                            String requesterName, String friendRowId) {
        sendToUser(username, "FRIEND_REQUEST", Map.of(
                "friendRowId",   friendRowId,
                "requesterId",   requesterId,
                "requesterName", requesterName
        ));
    }


}
