package com.codebattle.achievement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AchievementRepository extends JpaRepository<Achievement, String> {

    List<Achievement> findByUserIdOrderByUnlockedAtDesc(String userId);

    boolean existsByUserIdAndType(String userId, AchievementType type);
}
