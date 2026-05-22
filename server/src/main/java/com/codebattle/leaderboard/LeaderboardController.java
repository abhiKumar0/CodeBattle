package com.codebattle.leaderboard;

import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final JwtUtil jwtUtil;

    /** GET /api/leaderboard/global */
    @GetMapping("/global")
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> global() {
        List<LeaderboardDto.Entry> entries = leaderboardService.getGlobal();
        return ResponseEntity.ok(LeaderboardDto.LeaderboardResponse.builder()
                .type("global")
                .entries(entries)
                .total(entries.size())
                .build());
    }

    /** GET /api/leaderboard/weekly */
    @GetMapping("/weekly")
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> weekly() {
        List<LeaderboardDto.Entry> entries = leaderboardService.getWeekly();
        return ResponseEntity.ok(LeaderboardDto.LeaderboardResponse.builder()
                .type("weekly")
                .entries(entries)
                .total(entries.size())
                .build());
    }

    /** GET /api/leaderboard/friends/{userId} */
    @GetMapping("/friends/{userId}")
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> friends(
            @PathVariable String userId) {
        List<LeaderboardDto.Entry> entries = leaderboardService.getFriendsLeaderboard(userId);
        return ResponseEntity.ok(LeaderboardDto.LeaderboardResponse.builder()
                .type("friends")
                .entries(entries)
                .total(entries.size())
                .build());
    }

    /** GET /api/leaderboard/rank — own rank on both boards */
    @GetMapping("/rank")
    public ResponseEntity<LeaderboardDto.UserRank> myRank(
            @RequestHeader("Authorization") String authHeader) {
        String userId = jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
        return ResponseEntity.ok(leaderboardService.getUserRank(userId));
    }
}
