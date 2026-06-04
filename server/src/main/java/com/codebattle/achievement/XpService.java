package com.codebattle.achievement;


import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class XpService {


    private final UserRepository userRepository;

    // ---- XP Rewards --------------------------

    private static final int XP_WIN = 100;
    private static final int XP_LOSE = 20; // participation reward
    private static final int XP_STREAK_BONUS = 25; // bonus per active streak day


    // ─── Called after every match finish ─────────────────────────────────────

    @Transactional
    public int awardMatchXp(String userId, boolean won) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId));

        int xpGained = won ? XP_WIN : XP_LOSE;

        if (won) {
            // Streak bonus: +25 XP per streak level (capped at 10)
            int streakBonus = Math.min(user.getStreak(), 10) * XP_STREAK_BONUS;
            xpGained += streakBonus;
            log.debug("XP for {}: base={} streakBonus={}", user.getUsername(), XP_WIN, streakBonus);
        }

        user.setXp(user.getXp() + xpGained);
        userRepository.save(user);

        return xpGained;
    }

    @Transactional
    public void updateStreak(String userId, boolean won) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (won) {
            user.setStreak(user.getStreak() + 1);
        } else {
            user.setStreak(0); // loss resets streaks
        }

        userRepository.save(user);
        log.debug("Streak for {}: {} (won={})", user.getUsername(), user.getStreak(), won);
    }

    @Transactional
    public void awardAchievementXp(String userId, int xp) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        user.setXp(user.getXp() + xp);
        userRepository.save(user);
    }
}
