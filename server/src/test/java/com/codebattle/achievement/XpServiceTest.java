package com.codebattle.achievement;

import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class XpServiceTest {

    @Mock UserRepository userRepository;
    @InjectMocks XpService xpService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("u1").username("coder")
                .xp(0).streak(0).build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void winAwardsBaseXp() {
        int xp = xpService.awardMatchXp("u1", true);
        assertThat(xp).isGreaterThanOrEqualTo(100); // base XP_WIN
    }

    @Test
    void lossAwardsParticipationXp() {
        int xp = xpService.awardMatchXp("u1", false);
        assertThat(xp).isEqualTo(20); // XP_LOSS
    }

    @Test
    void streakBonusIncreasesXpOnWin() {
        user.setStreak(5);
        int xp = xpService.awardMatchXp("u1", true);
        assertThat(xp).isGreaterThan(100); // base + streak bonus
    }

    @Test
    void streakBonusCapsAtTenLevels() {
        user.setStreak(20); // above cap
        int xpAt20 = xpService.awardMatchXp("u1", true);

        user.setStreak(10); // at cap
        user.setXp(0);
        int xpAt10 = xpService.awardMatchXp("u1", true);

        assertThat(xpAt20).isEqualTo(xpAt10); // both capped at same bonus
    }

    @Test
    void winIncreasesStreak() {
        xpService.updateStreak("u1", true);
        assertThat(user.getStreak()).isEqualTo(1);
    }

    @Test
    void lossResetsStreak() {
        user.setStreak(5);
        xpService.updateStreak("u1", false);
        assertThat(user.getStreak()).isEqualTo(0);
    }

    @Test
    void xpAccumulatesCorrectly() {
        xpService.awardMatchXp("u1", true);
        xpService.awardMatchXp("u1", true);
        assertThat(user.getXp()).isGreaterThan(0);
    }
}