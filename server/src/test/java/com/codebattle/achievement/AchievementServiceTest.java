package com.codebattle.achievement;

import com.codebattle.notification.NotificationService;
import com.codebattle.notification.EmailService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock AchievementRepository achievementRepository;
    @Mock UserRepository userRepository;
    @Mock XpService xpService;
    @Mock NotificationService notificationService;
    @Mock EmailService emailService;

    @InjectMocks AchievementService achievementService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("user-id")
                .username("coder")
                .email("coder@test.com")
                .rating(1200)
                .wins(0)
                .streak(0)
                .build();

        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));
    }

    @Test
    void unlocksFirstWinAchievementOnFirstWin() {
        user.setWins(1);
        when(achievementRepository.existsByUserIdAndType("user-id", AchievementType.FIRST_WIN))
                .thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(achievementRepository).save(argThat(a ->
                a.getType() == AchievementType.FIRST_WIN));
    }

    @Test
    void doesNotUnlockFirstWinIfAlreadyUnlocked() {
        user.setWins(1);
        when(achievementRepository.existsByUserIdAndType("user-id", AchievementType.FIRST_WIN))
                .thenReturn(true);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(achievementRepository, never()).save(argThat(a ->
                a.getType() == AchievementType.FIRST_WIN));
    }

    @Test
    void unlocksStreakAchievementAt3() {
        user.setWins(5);
        user.setStreak(3);
        when(achievementRepository.existsByUserIdAndType(any(), any())).thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(achievementRepository).save(argThat(a ->
                a.getType() == AchievementType.STREAK_3));
    }

    @Test
    void unlocksRatingAchievementWhenThresholdReached() {
        user.setWins(1);
        user.setRating(1400);
        when(achievementRepository.existsByUserIdAndType(any(), any())).thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(achievementRepository).save(argThat(a ->
                a.getType() == AchievementType.RATING_1400));
    }

    @Test
    void awardsXpOnUnlock() {
        user.setWins(1);
        when(achievementRepository.existsByUserIdAndType("user-id", AchievementType.FIRST_WIN))
                .thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(xpService).awardAchievementXp("user-id", AchievementType.FIRST_WIN.getXpReward());
    }

    @Test
    void sendsWebSocketNotificationOnUnlock() {
        user.setWins(1);
        when(achievementRepository.existsByUserIdAndType(any(), any())).thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(notificationService, atLeastOnce()).sendToUser(eq("coder"),
                eq("ACHIEVEMENT_UNLOCKED"), any());
    }

    @Test
    void noAchievementsUnlockedOnLoss() {
        user.setWins(0);
        user.setRating(1200);
        user.setStreak(0);

        achievementService.evaluatePostMatch("user-id", false, 0, "EASY");

        // win-based achievements should not trigger on loss
        verify(achievementRepository, never()).save(argThat(a ->
                a.getType() == AchievementType.FIRST_WIN ||
                a.getType() == AchievementType.STREAK_3));
    }

    @Test
    void hardSolverAchievementOnlyForHardProblems() {
        user.setWins(1);
        when(achievementRepository.existsByUserIdAndType(any(), any())).thenReturn(false);

        achievementService.evaluatePostMatch("user-id", true, 0, "EASY");

        verify(achievementRepository, never()).save(argThat(a ->
                a.getType() == AchievementType.HARD_SOLVER));
    }
}