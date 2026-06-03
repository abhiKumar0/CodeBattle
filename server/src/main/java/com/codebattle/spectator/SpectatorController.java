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

@Controller                         // ← @Controller not @RestController (has @MessageMapping)
@RequiredArgsConstructor
@Slf4j
public class SpectatorController {

    private final SpectatorService   spectatorService;
    private final JwtUtil            jwtUtil;
    private final UserRepository     userRepository;
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

    // ── WebSocket: player sends code update → broadcast to spectators ─────────
    //
    // Client sends:  stompClient.publish({
    //   destination: `/app/spectate/${roomId}/code`,
    //   body: JSON.stringify({ code, language, userId, username })
    // })
    //
    // Server rebroadcasts to: /topic/spectate/{roomId}
    // All spectators subscribed there receive it instantly.

    @MessageMapping("/spectate/{roomId}/code")
    public void broadcastCode(
            @DestinationVariable String roomId,
            @Payload SpectatorDto.CodeUpdatePayload payload,
            SimpMessageHeaderAccessor headerAccessor) {

        // Extract userId from WS session (set by WebSocketAuthInterceptor)
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) {
            log.warn("Unauthenticated code broadcast attempt for room {}", roomId);
            return;
        }

        log.debug("Code update from {} in room {}, lang={}, chars={}",
                payload.getUsername(), roomId,
                payload.getLanguage(), payload.getCode().length());

        // Broadcast to /topic/spectate/{roomId}
        // All spectators subscribed there receive it
        ws.convertAndSend("/topic/spectate/" + roomId,
                Map.of(
                    "type",     "CODE_UPDATE",
                    "userId",   userId,
                    "username", payload.getUsername(),
                    "code",     payload.getCode(),
                    "language", payload.getLanguage()
                ));
    }

    private String extractId(String auth) {
        return jwtUtil.extractUserId(auth.replace("Bearer ", "").trim());
    }
}
