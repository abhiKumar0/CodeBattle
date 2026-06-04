package com.codebattle.spectator;

import com.codebattle.auth.JwtUtil;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@Slf4j
public class SpectatorController {

    private final SpectatorService   spectatorService;
    private final JwtUtil            jwtUtil;
    private final UserRepository     userRepository;

    // ── REST endpoints ────────────────────────────────────────────────────────

    @GetMapping("/api/spectate/rooms")
    @ResponseBody
    public ResponseEntity<List<SpectatorDto.ActiveRoomSummary>> getActiveRooms() {
        return ResponseEntity.ok(spectatorService.getActiveRooms());
    }

    @PostMapping("/api/spectate/join/{roomCode}")
    @ResponseBody
    public ResponseEntity<SpectatorDto.JoinResponse> join(
            @RequestHeader("Authorization") String auth,
            @PathVariable String roomCode) {
        String userId = extractId(auth);
        return ResponseEntity.ok(spectatorService.join(roomCode, userId));
    }

    @PostMapping("/api/spectate/leave/{roomId}")
    @ResponseBody
    public ResponseEntity<Void> leave(
            @RequestHeader("Authorization") String auth,
            @PathVariable String roomId) {
        String userId = extractId(auth);
        userRepository.findById(userId).ifPresent(user ->
            spectatorService.leave(roomId, user.getUsername())
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/spectate/count/{roomId}")
    @ResponseBody
    public ResponseEntity<Integer> count(@PathVariable String roomId) {
        return ResponseEntity.ok(spectatorService.getSpectatorCount(roomId));
    }

    private String extractId(String auth) {
        return jwtUtil.extractUserId(auth.replace("Bearer ", "").trim());
    }
}
