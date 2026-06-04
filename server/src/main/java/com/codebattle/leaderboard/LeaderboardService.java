package com.codebattle.leaderboard;

import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate; // to communicate with theredis (key =string , value=string)
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardService {

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;

    private static final String GLOBAL_KEY  = "leaderboard:global"; // key name in redis  
    private static final String WEEKLY_KEY  = "leaderboard:weekly";
    private static final int    TOP_N       = 50; 

    // ─── Update (called after ELO update in EloService) ──────────────────────

    /**
     * Sync both leaderboards after a match.
     * ZSet score = rating (global) or wins this week (weekly).
     */
    public void updateLeaderboard(String userId, int newRating, int weeklyWins) {
        // Global: score = ELO rating
        redisTemplate.opsForZSet().add(GLOBAL_KEY, userId, newRating);

        // Weekly: score = win count this week
        redisTemplate.opsForZSet().add(WEEKLY_KEY, userId, weeklyWins);

        log.debug("Leaderboard updated for user {}: rating={}, weeklyWins={}",
                userId, newRating, weeklyWins);
    }

    /**
     * Increment weekly win count by 1 for winner only.
     * Uses ZINCRBY — atomic, no race condition.
     */
    public void incrementWeeklyWin(String userId) {
        redisTemplate.opsForZSet().incrementScore(WEEKLY_KEY, userId, 1);
    }

    // ─── Queries 

    public List<LeaderboardDto.Entry> getGlobal() {
        return fetchTopN(GLOBAL_KEY);
    }

    public List<LeaderboardDto.Entry> getWeekly() {
        return fetchTopN(WEEKLY_KEY);
    }

    public List<LeaderboardDto.Entry> getFriendsLeaderboard(String userId) {
        // Pull friend IDs from DB, filter ZSet entries for those IDs
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        List<String> friendIds = userRepository.findFriendIds(userId);
        friendIds.add(userId); // include self

        List<LeaderboardDto.Entry> all = fetchTopN(GLOBAL_KEY);
        return all.stream()
                .filter(e -> friendIds.contains(e.getUserId()))
                .toList();
    }

    /** Get a specific user's rank on global leaderboard (1-indexed) */
    public LeaderboardDto.UserRank getUserRank(String userId) {
        Long globalRank  = redisTemplate.opsForZSet().reverseRank(GLOBAL_KEY, userId);
        Double globalScore = redisTemplate.opsForZSet().score(GLOBAL_KEY, userId);

        Long weeklyRank  = redisTemplate.opsForZSet().reverseRank(WEEKLY_KEY, userId);
        Double weeklyScore = redisTemplate.opsForZSet().score(WEEKLY_KEY, userId);

        return LeaderboardDto.UserRank.builder()
                .userId(userId)
                .globalRank(globalRank  != null ? globalRank  + 1 : null) // 0-indexed → 1-indexed
                .weeklyRank(weeklyRank  != null ? weeklyRank  + 1 : null)
                .globalScore(globalScore != null ? globalScore.intValue() : 0)
                .weeklyScore(weeklyScore != null ? weeklyScore.intValue() : 0)
                .build();
    }

    // ─── Weekly reset (called by scheduler every Monday) 

    public void resetWeeklyLeaderboard() {
        redisTemplate.delete(WEEKLY_KEY);
        log.info("Weekly leaderboard reset at {}", LocalDateTime.now());
    }

    // ─── Seed from DB (on startup, sync Redis with Postgres) 
    /**
     * Rebuilds the global leaderboard ZSet from DB.
     * Call once on startup or after a Redis flush.
     */
    public void seedFromDatabase() {
        List<User> users = userRepository.findAll();
        users.forEach(u ->
                redisTemplate.opsForZSet().add(GLOBAL_KEY, u.getId(), u.getRating()));
        log.info("Seeded global leaderboard with {} users", users.size());
    }

    // ─── Internal 

    private List<LeaderboardDto.Entry> fetchTopN(String key) {
        // reverseRange = highest score first (descending)
        Set<ZSetOperations.TypedTuple<String>> tuples =
                redisTemplate.opsForZSet().reverseRangeWithScores(key, 0, TOP_N - 1);

        if (tuples == null || tuples.isEmpty()) return List.of();

        List<LeaderboardDto.Entry> entries = new ArrayList<>();
        int rank = 1;

        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            String userId = tuple.getValue();
            int score     = tuple.getScore() != null ? tuple.getScore().intValue() : 0;

            // Fetch username from DB — consider caching this in Redis in future
            String username = userRepository.findById(userId)
                    .map(User::getUsername)
                    .orElse("Unknown");

            entries.add(LeaderboardDto.Entry.builder()
                    .rank(rank++)
                    .userId(userId)
                    .username(username)
                    .score(score)
                    .build());
        }

        return entries;
    }
}
