package com.codebattle.achievement;


import com.codebattle.notification.NotificationService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AchievementService {


    private final AchievementRepository achievementRepository;
    private final UserRepository userRepository;
    private final XpService xpService;
    private final NotificationService notificationService;


    // ─── Evaluate all achievements after a match ──────────────────────────────

    /**
     * Call this after ELO + XP + streak have been updated.
     * Checks all relevant conditions and unlocks any newly earned achievements.
     */

    @Transactional
    public void evaluatePostMatch(String userId, boolean won,
                                  int executionTimeMs, String problemDifficulty) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        List<AchievementType> toUnlock = new ArrayList<>();

        if (won) {
            // Win count milestones
            if (user.getWins() == 1)   toUnlock.add(AchievementType.FIRST_WIN);
            if (user.getWins() == 5)   toUnlock.add(AchievementType.WIN_5);
            if (user.getWins() == 25)  toUnlock.add(AchievementType.WIN_25);
            if (user.getWins() == 100) toUnlock.add(AchievementType.WIN_100);

            // Streak milestones
            if (user.getStreak() == 3)  toUnlock.add(AchievementType.STREAK_3);
            if (user.getStreak() == 5)  toUnlock.add(AchievementType.STREAK_5);
            if (user.getStreak() == 10) toUnlock.add(AchievementType.STREAK_10);

            // Speed demon: solved in under 2 minutes
            if (executionTimeMs > 0 && executionTimeMs < 120_000) {
                toUnlock.add(AchievementType.SPEED_DEMON);
            }

            // Hard problem solved
            if ("HARD".equals(problemDifficulty)) {
                toUnlock.add(AchievementType.HARD_SOLVER);
            }
        }

        // Rating milestones (check regardless of win/loss since ELO already updated)
        int rating = user.getRating();
        if (rating >= 1400) toUnlock.add(AchievementType.RATING_1400);
        if (rating >= 1600) toUnlock.add(AchievementType.RATING_1600);
        if (rating >= 1800) toUnlock.add(AchievementType.RATING_1800);
        if (rating >= 2000) toUnlock.add(AchievementType.RATING_2000);

        toUnlock.forEach(type -> unlock(user, type));
    };


    /** Called from FriendService after first friend added */
    @Transactional
    public void evaluateFriendAchievements(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        long friendCount = achievementRepository
                .existsByUserIdAndType(userId, AchievementType.FIRST_FRIEND) ? 1 : 0;
        if (friendCount == 0) unlock(user, AchievementType.FIRST_FRIEND);
    }


    // ─── Unlock a single achievement ──────────────────────────────────────────

    @Transactional
    public void unlock(User user, AchievementType type) {
        // Idempotent — skip if already unlocked
        if (achievementRepository.existsByUserIdAndType(user.getId(), type)) return;

        Achievement achievement = Achievement.builder()
                .user(user)
                .type(type)
                .build();

        achievementRepository.save(achievement);

        // Award XP for the achievement
        xpService.awardAchievementXp(user.getId(), type.getXpReward());

        // Notify user via WebSocket
        notificationService.sendToUser(
                user.getUsername(),
                "ACHIEVEMENT_UNLOCKED",
                java.util.Map.of(
                        "type",        type.name(),
                        "title",       type.getTitle(),
                        "description", type.getDescription(),
                        "xpReward",    type.getXpReward()
                )
        );

        log.info("Achievement unlocked for {}: {} (+{}xp)",
                user.getUsername(), type.getTitle(), type.getXpReward());
    }


    // ─── Query ────────────────────────────────────────────────────────────────

    public AchievementDto.AchievementsListResponse getAchievements(String userId) {
        List<Achievement> achievements =
                achievementRepository.findByUserIdOrderByUnlockedAtDesc(userId);

        List<AchievementDto.AchievementResponse> responses = achievements.stream()
                .map(a -> AchievementDto.AchievementResponse.builder()
                        .id(a.getId())
                        .type(a.getType())
                        .title(a.getType().getTitle())
                        .description(a.getType().getDescription())
                        .xpReward(a.getType().getXpReward())
                        .unlockedAt(a.getUnlockedAt())
                        .build())
                .toList();

        int totalXp = responses.stream()
                .mapToInt(AchievementDto.AchievementResponse::getXpReward)
                .sum();

        return AchievementDto.AchievementsListResponse.builder()
                .unlocked(responses)
                .totalXpFromAchievements(totalXp)
                .build();
    }


}
