package com.codebattle.room;


import ch.qos.logback.core.util.FixedDelay;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Data
@RequiredArgsConstructor
@Slf4j
@Component
public class RoomExpiryScheduler {
    private final RoomService roomService;


    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void expireAbandonedRooms(){
        log.debug("Scheduling room expiry check...");
        roomService.expireAbandonedRoom();
    }
}
