package com.codebattle.room;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Manages per-room expiry timers using Spring's TaskScheduler.
 *
 * When a room becomes ACTIVE, a one-shot task is scheduled to fire
 * at exactly (startedAt + duration). If the match finishes early
 * (e.g. a player submits ACCEPTED), the timer is cancelled.
 *
 * Uses ApplicationContext to lazily resolve RoomService and avoid
 * circular dependency (RoomService → RoomExpiryTaskManager → RoomService).
 */
@Service
@Slf4j
public class RoomExpiryTaskManager {

    private final TaskScheduler taskScheduler;
    private final ApplicationContext applicationContext;

    /** roomId → scheduled future handle (for cancellation) */
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    public RoomExpiryTaskManager(TaskScheduler taskScheduler, ApplicationContext applicationContext) {
        this.taskScheduler = taskScheduler;
        this.applicationContext = applicationContext;
    }

    /**
     * Schedule a room to expire at the given instant.
     * If the instant is already in the past, fires immediately.
     * Idempotent — cancels any existing timer for this room first.
     */
    public void scheduleExpiry(String roomId, Instant expiresAt) {
        cancelExpiry(roomId);

        if (expiresAt.isBefore(Instant.now())) {
            log.info("Room {} already past expiry time, triggering immediate expiration", roomId);
            triggerExpiry(roomId);
            return;
        }

        ScheduledFuture<?> future = taskScheduler.schedule(
                () -> triggerExpiry(roomId),
                expiresAt
        );
        scheduledTasks.put(roomId, future);

        long secondsUntil = expiresAt.getEpochSecond() - Instant.now().getEpochSecond();
        log.info("Scheduled expiry for room {} in {}s (at {})", roomId, secondsUntil, expiresAt);
    }

    /**
     * Cancel a pending expiry timer — called when a match finishes early.
     */
    public void cancelExpiry(String roomId) {
        ScheduledFuture<?> future = scheduledTasks.remove(roomId);
        if (future != null && !future.isDone()) {
            future.cancel(false);
            log.debug("Cancelled expiry timer for room {}", roomId);
        }
    }

    /**
     * Check how many timers are currently active (for monitoring/debugging).
     */
    public int activeTimerCount() {
        return scheduledTasks.size();
    }

    /**
     * Called when the timer fires. Delegates to RoomService for the actual
     * DB update, broadcast, and spectator cleanup.
     */
    private void triggerExpiry(String roomId) {
        try {
            // Lazy lookup to avoid circular dependency
            RoomService roomService = applicationContext.getBean(RoomService.class);
            roomService.expireSingleRoom(roomId);
        } catch (Exception e) {
            log.error("Failed to expire room {}: {}", roomId, e.getMessage(), e);
        } finally {
            scheduledTasks.remove(roomId);
        }
    }
}
