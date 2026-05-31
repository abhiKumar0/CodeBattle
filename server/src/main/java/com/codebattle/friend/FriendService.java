package com.codebattle.friend;

import com.codebattle.achievement.AchievementService;
import com.codebattle.notification.NotificationService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendRepository     friendRepository;
    private final UserRepository       userRepository;
    private final NotificationService  notificationService;
    private final AchievementService   achievementService;

    // ── Send Request ──────────────────────────────────────────────────────────
    @Transactional
    public FriendDto.FriendResponse sendRequest(String requestedId, String targetUserId) {
        if (requestedId.equals(targetUserId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot send friend request to yourself");

        User requester = findUserOrThrow(requestedId);
        User target    = findUserOrThrow(targetUserId);

        friendRepository.findBetween(requestedId, targetUserId).ifPresent(f -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Friend request already exists (status: " + f.getStatus() + ")");
        });

        Friend friend = Friend.builder()
                .user(requester)
                .friend(target)
                .status(FriendStatus.PENDING)
                .build();
        Friend saved = friendRepository.save(friend);

        // FIX: use notifyFriendRequest, not notifyChallengeReceived
        notificationService.notifyFriendRequest(target.getId(), requester.getUsername());

        return toResponse(saved, target);
    }

    // ── Accept ────────────────────────────────────────────────────────────────
    @Transactional
    public FriendDto.FriendResponse acceptRequest(String userId, String requesterId) {
        Friend friend = friendRepository.findBetween(requesterId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Friend request not found"));

        if (friend.getStatus() != FriendStatus.PENDING)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending");

        friend.setStatus(FriendStatus.ACCEPTED);
        Friend saved = friendRepository.save(friend);

        achievementService.evaluateFriendAchievements(userId);
        achievementService.evaluateFriendAchievements(friend.getUser().getId());

        // FIX: use notifyFriendAccepted, not sendToUser
        notificationService.notifyFriendAccepted(
                friend.getUser().getId(),
                friend.getFriend().getUsername()
        );

        return toResponse(saved, friend.getUser());
    }

    // ── Remove ────────────────────────────────────────────────────────────────
    public void removeFriend(String userId, String friendUserId) {
        Friend friend = friendRepository.findBetween(userId, friendUserId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Friend relationship not found"));
        friendRepository.delete(friend);
    }

    // ── Queries ───────────────────────────────────────────────────────────────
    public List<FriendDto.FriendResponse> getFriends(String userId) {
        return friendRepository.findAcceptedFriends(userId).stream()
                .map(f -> {
                    User other = f.getUser().getId().equals(userId)
                            ? f.getFriend() : f.getUser();
                    return toResponse(f, other);
                }).toList();
    }

    public List<FriendDto.FriendResponse> getPendingRequests(String userId) {
        return friendRepository.findPendingRequests(userId).stream()
                .map(f -> toResponse(f, f.getUser()))
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    private FriendDto.FriendResponse toResponse(Friend f, User other) {
        return FriendDto.FriendResponse.builder()
                .id(f.getId())
                .userId(other.getId())
                .username(other.getUsername())
                .rating(other.getRating())
                .status(f.getStatus())
                .createdAt(f.getCreatedAt())
                .build();
    }
}