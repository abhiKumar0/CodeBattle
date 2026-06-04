package com.codebattle.match;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * The Redis in-queue TTL marker (match:in-queue:{userId}) auto-expires after 60s,
 * but the userId may still be sitting in the match:queue List.
 *
 * This scheduler removes orphaned userIds from the list every minute
 * by checking whether their TTL marker still exists.
 */

@Component
@RequiredArgsConstructor
@Slf4j
public class StaleQueueCleanupScheduler {

    private final StringRedisTemplate redisTemplate;
    private final MatchMakingService matchMakingService;

    private static final String QUEUE_KEY = "match:queue";
    private static final String IN_QUEUE_KEY = "match:queue";


    @Scheduled(fixedRate = 600_000)
    public void cleanupStaleEntries() {
        List<String> queue = redisTemplate.opsForList().range(IN_QUEUE_KEY, 0, -1);

        if (queue == null || queue.isEmpty()) return;

        int removed = 0;
        for (String key : queue) {
            //If TTL marker is gone, the user timed out - remove from list

            if (!Objects.equals(Boolean.TRUE, redisTemplate.hasKey(IN_QUEUE_KEY + key))) {
                redisTemplate.opsForList().remove(QUEUE_KEY, 0, key);
                removed++;
                log.debug("Removed stale entries from queue: {}", key);
            }
        }

        if (removed > 0) {
            log.info("Cleaned {} stale matchmaking queue entries", removed);
        }
    }

}
