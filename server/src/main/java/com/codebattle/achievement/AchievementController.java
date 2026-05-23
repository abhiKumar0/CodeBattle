package com.codebattle.achievement;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {


    private AchievementService achievementService;

    /** GET /api/achievements/{userId} */
    @GetMapping("/{userId}")
    public ResponseEntity<AchievementDto.AchievementsListResponse> getAchievements(
            @PathVariable String userId) {
        return ResponseEntity.ok(achievementService.getAchievements(userId));
    }
}
