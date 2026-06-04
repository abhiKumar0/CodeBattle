package com.codebattle.room;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RoomExpiryScheduler {

    private final RoomService roomService;
    private final RoomExpiryTaskManager expiryTaskManager;
    private final RoomRepository roomRepository;

    // Expire abandoned lobby rooms (CREATED/WAITING older than 10 min)
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void expireAbandonedRooms() {
        log.debug("Checking for abandoned lobby rooms...");
        roomService.expireAbandonedRoom();
    }

    // Fallback sweep: catch any timed-out ACTIVE rooms the timers missed
    @Scheduled(fixedDelay = 5 * 60 * 1000, initialDelay = 60_000)
    public void fallbackExpireActiveRooms() {
        log.debug("Fallback: checking for timed-out active rooms...");
        roomService.expireTimedOutRooms();
    }

    // On startup: reschedule expiry timers for any ACTIVE rooms
    // that survived a server restart
    @EventListener(ApplicationReadyEvent.class)
    public void rescheduleOnStartup() {
        List<Room> activeRooms = roomRepository.findAllByStatus(RoomStatus.ACTIVE);
        int count = 0;

        for (Room room : activeRooms) {
            if (room.getStartedAt() != null && room.getDuration() > 0) {
                Instant expiresAt = room.getStartedAt()
                        .atZone(ZoneId.systemDefault())
                        .toInstant()
                        .plus(Duration.ofMinutes(room.getDuration()));
                expiryTaskManager.scheduleExpiry(room.getId(), expiresAt);
                count++;
            }
        }

        if (count > 0) {
            log.info("Rescheduled expiry timers for {} active rooms after startup", count);
        }
    }
}
