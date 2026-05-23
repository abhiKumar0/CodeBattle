package com.codebattle.challenge;


import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/challenges")
@RequiredArgsConstructor
public class ChallengerController {

    private final ChallengeService challengeService;
    private final JwtUtil jwtUtil;


    /** POST /api/challenges/send/{userId} */
    @PostMapping("/send/{targetUserId}")
    public ResponseEntity<ChallengeDto.ChallengeResponse> send(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String targetUserId) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(challengeService.sendChallenge(userId, targetUserId));
    }

    /** PUT /api/challenges/accept/{id} */
    @PutMapping("/accept/{id}")
    public ResponseEntity<ChallengeDto.ChallengeResponse> accept(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(challengeService.acceptChallenge(userId, id));
    }


    /** PUT /api/challenges/decline/{id} */
    @PutMapping("/decline/{id}")
    public ResponseEntity<Void> decline(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {

        String userId = extractUserId(authHeader);
        challengeService.declineChallenge(userId, id);
        return ResponseEntity.noContent().build();
    }

    private String extractUserId(String authHeader) {
        return jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
    }
}
