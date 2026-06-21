package com.codebattle.spectator;

import com.codebattle.auth.JwtUtil;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class SpectatorController {

    private final SpectatorService      spectatorService;
    private final JwtUtil               jwtUtil;
    private final UserRepository        userRepository;
    private final SimpMessagingTemplate ws;

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

    // ── WebSocket: player types code → server rebroadcasts to spectators ─────
    //
    // Client (room page) publishes to:  /app/spectate/{roomId}/code
    // Server broadcasts to:             /topic/spectate/{roomId}
    // Spectators subscribed there receive CODE_UPDATE instantly
    //
    @MessageMapping("/spectate/{roomId}/code")
    public void broadcastCode(
            @DestinationVariable String roomId,
            @Payload SpectatorDto.CodeUpdatePayload payload,
            SimpMessageHeaderAccessor headerAccessor) {

        // Get userId from WS session (set by WebSocketAuthInterceptor)
        Object userIdObj = headerAccessor.getSessionAttributes() != null
                ? headerAccessor.getSessionAttributes().get("userId")
                : null;

        if (userIdObj == null) {
            log.warn("Unauthenticated code broadcast for room {}", roomId);
            return;
        }

        String userId = userIdObj.toString();

        log.debug("Code update: room={}, user={}, lang={}, chars={}",
                roomId, payload.getUsername(),
                payload.getLanguage(),
                payload.getCode() != null ? payload.getCode().length() : 0);

        // Rebroadcast to all spectators watching this room
        ws.convertAndSend(
                "/topic/spectate/" + roomId,
                Map.of(
                        "type",     "CODE_UPDATE",
                        "userId",   userId,
                        "username", payload.getUsername() != null ? payload.getUsername() : "",
                        "code",     payload.getCode() != null ? payload.getCode() : "",
                        "language", payload.getLanguage() != null ? payload.getLanguage() : "java"
                )
        );
    }

    private String extractId(String auth) {
        return jwtUtil.extractUserId(auth.replace("Bearer ", "").trim());
    }
}