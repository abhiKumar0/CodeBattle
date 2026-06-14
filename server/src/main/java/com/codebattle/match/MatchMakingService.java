package com.codebattle.match;


import com.codebattle.match.dto.MatchDto;
import com.codebattle.notification.NotificationService;
import com.codebattle.room.RoomService;
import com.codebattle.room.dto.RoomDto;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * Matchmaking via a Redis List used as a queue.
 *
 * Redis key: match:queue
 *
 * Flow:
 *  1. User calls /api/match/random
 *  2. If queue is empty  → push userId, wait (polling or WebSocket notify)
 *  3. If queue has entry → pop it, pair the two users, create + auto-join room
 *  4. Notify both via WebSocket /user/queue/notifications → MATCH_FOUND
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchMakingService {

    private final StringRedisTemplate redisTemplate;
    private final RoomService roomService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final String QUEUE_KEY       = "match:queue";
    private static final String IN_QUEUE_KEY    = "match:in-queue:"; // match:in-queue:{userId}
    private static final long   QUEUE_TTL_SECS  = 60;                 // remove from queue after 60s


    // --------- Join Queue -----------------------

    public MatchDto.MatchResponse joinQueue(String userId) {
        User user = findUserOrThrow(userId);

        if (isInQueue(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already in the matchmaking queue");
        }


        // Try to pop a waiting opponent
        String opponentId = redisTemplate.opsForList().leftPop(QUEUE_KEY);

        if (opponentId != null && !opponentId.equals(userId)) {
            //Opponent found - clean up their in-queue marker
            redisTemplate.delete(IN_QUEUE_KEY + opponentId);

            // Create room as opponent, join as current user;
            return createMatch(opponentId, userId);
        }

        //If we popped ourselves somehow (race), push back and wait
        if (opponentId != null && opponentId.equals(userId)) {
            redisTemplate.opsForList().rightPush(QUEUE_KEY, userId);
        }


        //No opponent yet - push self to queue
        redisTemplate.opsForList().rightPush(QUEUE_KEY, userId);

        //TTL marker so stale entries self-clean
        redisTemplate.opsForValue().set(IN_QUEUE_KEY + userId, "1", QUEUE_TTL_SECS, TimeUnit.SECONDS);

        log.info("User {} joined matchmaking queue", user.getUsername());

        return MatchDto.MatchResponse.builder()
                .status(MatchDto.MatchStatus.WAITING)
                .message("In queue, waiting for opponent...")
                .build();
    }


    // ------- Cancel Queue ---------------

    public void cancelQueue(String userId) {
        if (!isInQueue(userId)) return;

        // Remove from queue list (all occurrences)
        redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
        redisTemplate.delete(IN_QUEUE_KEY + userId);

        log.info("User {} left matchmaking queue", userId);
    }



    // ----------------- Queue Status --------------------

    public boolean isInQueue(String userId) {
        return Objects.equals(Boolean.TRUE, redisTemplate.hasKey(IN_QUEUE_KEY + userId));
    }


    public MatchDto.MatchResponse getQueueStatus(String userId) {
        if (isInQueue(userId)) {
            Long queueSize = redisTemplate.opsForList().size(QUEUE_KEY);

            return MatchDto.MatchResponse.builder()
                    .status(MatchDto.MatchStatus.WAITING)
                    .queueSize(queueSize != null ? queueSize.intValue() : 0)
                    .message("In queue, waiting for opponent...")
                    .build();
        }

        return MatchDto.MatchResponse.builder()
                .status(MatchDto.MatchStatus.IDLE)
                .message("Not in queue")
                .build();
    }


    // ─── Internal: create match between two users ─────────────────────────────

    private MatchDto.MatchResponse createMatch(String creatorId, String joinerId) {
        User creator = findUserOrThrow(creatorId);
        User joiner = findUserOrThrow(joinerId);

        // Create Make the room
        RoomDto.RoomResponse room = roomService.createRoom(
                creatorId,
                RoomDto.createRequest.builder().duration(30).build()
        );

        //Joiner auto-joins
        RoomDto.RoomResponse joined = roomService.joinRoom(room.getCode(), joinerId);


        // Notify both players via WebSocket personal chanel
        notificationService.notifyMatchFound(
                creator.getUsername(), joined.getId(), joined.getCode()
        );
        notificationService.notifyMatchFound(
                joiner.getUsername(), joined.getId(), joined.getCode()
        );


        log.info("Match created: {} vs {} in room {}",
                creator.getUsername(), joiner.getUsername(), joined.getCode());

        return MatchDto.MatchResponse.builder()
                .status(MatchDto.MatchStatus.MATCHED)
                .roomId(joined.getId())
                .roomCode(joined.getCode())
                .opponentUsername(joiner.getUsername())
                .opponentRating(joiner.getRating())
                .message("Opponent found! Redirecting to room...")
                .build();
    }


    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }


}
