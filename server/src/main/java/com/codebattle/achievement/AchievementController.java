package com.codebattle.achievement;


import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
public class AchievementController {


    private final AchievementService achievementService;
    private final JwtUtil jwtUtil;

    /** GET /api/achievements/my */
    @GetMapping("/my")
    public ResponseEntity<AchievementDto.AchievementsListResponse> getMyAchievements(
            @RequestHeader("Authorization") String authHeader) {
        String userId = jwtUtil.extractUserId(
                authHeader.replace("Bearer ", "").trim());
        return ResponseEntity.ok(achievementService.getAchievements(userId));
    }


    /** GET /api/achievements/{userId} */
    @GetMapping("/{userId}")
    public ResponseEntity<AchievementDto.AchievementsListResponse> getAchievements(
            @PathVariable String userId) {
        return ResponseEntity.ok(achievementService.getAchievements(userId));
    }
}
