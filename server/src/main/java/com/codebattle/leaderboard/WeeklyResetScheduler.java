package com.codebattle.leaderboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeeklyResetScheduler {

    private final LeaderboardService leaderboardService;

    /**
     * Fires every Monday at 00:00 UTC.
     * Cron: second minute hour day month weekday
     */
    @Scheduled(cron = "0 0 0 * * MON", zone = "UTC")
    public void resetWeekly() {
        log.info("Resetting weekly leaderboard...");
        leaderboardService.resetWeeklyLeaderboard();
    }
}
