package com.codebattle.match;


import com.codebattle.auth.JwtUtil;
import com.codebattle.match.dto.MatchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/match")
@RequiredArgsConstructor
public class MatchController {

    private final MatchMakingService matchMakingService;
    private final JwtUtil jwtUtil;



    /**
     * POST /api/match/random
     * Join the matchmaking queue. Returns immediately:
     *  - MATCHED  → room created, roomId + roomCode in response
     *  - WAITING  → in queue, frontend polls or waits for WS notification
     */
    @PostMapping("/random")
    public ResponseEntity<MatchDto.MatchResponse> joinQueue(
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(matchMakingService.joinQueue(userId));
    }


    /**
     * DELETE /api/match/cancel
     * Leave the queue (user navigated away / cancelled).
     */
    @DeleteMapping("/cancel")
    public ResponseEntity<MatchDto.MatchResponse> cancelQueue(
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        matchMakingService.cancelQueue(userId);
        return ResponseEntity.noContent().build();
    }


    /**
     * GET /api/match/status
     * Poll-based fallback if WebSocket isn't available.
     */
    @GetMapping("/status")
    public ResponseEntity<MatchDto.MatchResponse> getStatus(
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(matchMakingService.getQueueStatus(userId));
    }







    private String extractUserId(String authHeader) {
        return jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
    }
}
