package com.codebattle.notification;

import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate  ws;
    private final NotificationRepository repo;
    private final UserRepository         userRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // LOW-LEVEL: used by ChallengeService, FriendService, AchievementService
    // for realtime-only pushes (no DB persistence needed)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Raw realtime push — no DB persistence.
     * Used by ChallengeService and FriendService for quick WS events.
     */
    public void sendToUser(String username, String type, Object payload) {
        ws.convertAndSendToUser(
                username,
                "/queue/notifications",
                Map.of("type", type, "payload", payload)
        );
        log.debug("Realtime push → {}: {}", username, type);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MATCH NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Called by EloService — OLD signature (username, won, ratingChange, newRating).
     * Persists to DB + pushes realtime.
     */
    public void notifyMatchResult(String username, boolean won,
                                  int ratingChange, int newRating) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) { log.warn("notifyMatchResult: user not found {}", username); return; }

        String sign  = ratingChange >= 0 ? "+" : "";
        String title = won ? "Victory! ⚔️" : "Defeated 💀";
        String body  = won
                ? "You won the battle! Rating: " + sign + ratingChange + " → " + newRating
                : "You lost the battle. Rating: " + sign + ratingChange + " → " + newRating;

        save(user, "MATCH_RESULT", title, body, "/profile", null);
    }

    /**
     * Called by EloService — NEW signature with opponentUsername for richer message.
     * Also persists to DB + pushes realtime.
     */
    public void notifyMatchResult(String userId, boolean won,
                                  String opponentUsername, int ratingChange, int newRating) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) { log.warn("notifyMatchResult: user not found {}", userId); return; }

        String sign  = ratingChange >= 0 ? "+" : "";
        String title = won ? "Victory! ⚔️" : "Defeated 💀";
        String body  = won
                ? "You beat " + opponentUsername + " · Rating: " + sign + ratingChange + " → " + newRating
                : "Lost to " + opponentUsername + " · Rating: " + sign + ratingChange + " → " + newRating;

        save(user, "MATCH_RESULT", title, body, "/profile", opponentUsername);
    }

    /**
     * Called by ChallengeService / MatchService when opponent is found.
     * Realtime only — no persistence (user will be redirected immediately).
     */
    public void notifyMatchFound(String username, String roomId, String roomCode) {
        sendToUser(username, "MATCH_FOUND",
                Map.of("roomId", roomId, "roomCode", roomCode));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHALLENGE NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Called by ChallengeService AND FriendService (wrong usage in FriendService —
     * FriendService should call notifyFriendRequest, but we keep this compatible).
     * OLD signature: (username, challengerId, challengerName, challengeId)
     */
    public void notifyChallengeReceived(String username, String challengerId,
                                        String challengerName, String challengeId) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            // Fallback: raw push without persistence
            sendToUser(username, "CHALLENGE_RECEIVED",
                    Map.of("challengeId", challengeId,
                           "challengerId", challengerId,
                           "challengerName", challengerName));
            return;
        }
        String title = challengerName + " challenged you! ⚔️";
        String body  = "Accept the challenge before it expires (5 min).";
        save(user, "CHALLENGE_RECEIVED", title, body, "/friends", challengerName);
    }

    /**
     * NEW signature called by NotificationService itself — userId version.
     */
    public void notifyChallengeReceived(String userId, String challengerUsername,
                                        String challengeId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        String title = challengerUsername + " challenged you! ⚔️";
        String body  = "Accept the challenge before it expires.";
        save(user, "CHALLENGE_RECEIVED", title, body, "/friends", challengerUsername);
    }

    public void notifyChallengeAccepted(String userId, String opponentUsername,
                                        String roomCode) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        String title = opponentUsername + " accepted your challenge!";
        String body  = "Head to room " + roomCode + " to battle.";
        save(user, "CHALLENGE_ACCEPTED", title, body, "/room/" + roomCode, opponentUsername);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FRIEND NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    public void notifyFriendRequest(String userId, String requesterUsername) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        String title = requesterUsername + " sent you a friend request";
        String body  = "Accept to start challenging each other!";
        save(user, "FRIEND_REQUEST", title, body, "/friends", requesterUsername);
    }

    public void notifyFriendAccepted(String userId, String acceptorUsername) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        String title = acceptorUsername + " accepted your friend request";
        String body  = "You can now challenge each other to battles!";
        save(user, "FRIEND_ACCEPTED", title, body, "/friends", acceptorUsername);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACHIEVEMENT NOTIFICATION
    // Called by AchievementService via sendToUser() — already compatible.
    // But also provide a typed method for cleaner calling.
    // ─────────────────────────────────────────────────────────────────────────

    public void notifyAchievement(String userId, String achievementTitle,
                                   String description, int xpReward) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        String title = "Achievement Unlocked 🏅";
        String body  = achievementTitle + " — " + description + " (+" + xpReward + " XP)";
        save(user, "ACHIEVEMENT", title, body, "/profile", null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OTHER TYPED METHODS
    // ─────────────────────────────────────────────────────────────────────────

    public void notifyRatingMilestone(String userId, int newRating) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        save(user, "RATING_UPDATE", "New rating milestone 🚀",
                "Your rating is now " + newRating + "!", "/profile", null);
    }

    public void notifyDailyProblem(String userId, String problemTitle,
                                    String difficulty, String problemId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        save(user, "DAILY_PROBLEM",
                "Daily Problem: " + problemTitle,
                "Solve today's " + difficulty + " challenge!",
                "/problems/" + problemId, null);
    }

    public void notifyRankUp(String userId, int newRank) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        save(user, "RANK_UP",
                "You're now ranked #" + newRank + " 🏆",
                "Keep winning to climb higher!", "/leaderboard", null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REST API methods (called by NotificationController)
    // ─────────────────────────────────────────────────────────────────────────

    public List<NotificationDto.NotifResponse> getForUser(String userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 30))
                .stream().map(this::toDto).toList();
    }

    public long getUnreadCount(String userId) {
        return repo.countByUserIdAndReadFalse(userId);
    }

    public void markAllRead(String userId) {
        repo.markAllReadForUser(userId);
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) pushCount(user.getUsername(), 0);
    }

    public void markOneRead(String notifId, String userId) {
        repo.markOneRead(notifId, userId);
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) pushCount(user.getUsername(), repo.countByUserIdAndReadFalse(userId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private void save(User user, String type, String title, String body,
                      String actionUrl, String actorUsername) {
        Notification n = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .actionUrl(actionUrl)
                .actorUsername(actorUsername)
                .actorInitial(actorUsername != null
                        ? String.valueOf(actorUsername.charAt(0)).toUpperCase()
                        : null)
                .build();
        repo.save(n);

        // Push realtime to client
        sendToUser(user.getUsername(), "NEW_NOTIFICATION", toDto(n));
        pushCount(user.getUsername(), repo.countByUserIdAndReadFalse(user.getId()));
    }

    private void pushCount(String username, long count) {
        sendToUser(username, "UNREAD_COUNT", Map.of("count", count));
    }

    private NotificationDto.NotifResponse toDto(Notification n) {
        return NotificationDto.NotifResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .actionUrl(n.getActionUrl())
                .actorUsername(n.getActorUsername())
                .actorInitial(n.getActorInitial())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}