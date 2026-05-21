package com.codebattle.room;

import com.codebattle.room.dto.RoomDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * Handles inbound STOMP messages from the frontend.
 *
 * Frontend sends to: /app/room/{roomId}/ping
 *                    /app/room/{roomId}/typing
 *
 * These complement the HTTP REST endpoints — WebSocket is only for
 * lightweight real-time signals, not state mutations (those stay HTTP).
 */

@Controller
@RequiredArgsConstructor
@Slf4j
public class RoomWebSocketController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final RoomService roomService;

    /**
     * Heartbeat ping — frontend sends this every 30s to confirm presence.
     * Server echoes back a pong to /topic/room/{roomId}.
     *
     * STOMP destination: /app/room/{roomId}/ping
     */
    @MessageMapping("/room/{roomId}/ping")
    public void ping(@DestinationVariable String roomId, SimpMessageHeaderAccessor accessor) {
        String userId = (String) accessor.getSessionAttributes().get("userId");

        log.debug("Ping from user {} in room {}", userId, roomId);

        simpMessagingTemplate.convertAndSend("/topic/room" + roomId,
                RoomDto.RoomEvent.builder()
                        .type("PONG")
                        .payload(Map.of("userId", userId))
                        .build());
    }


    /**
     * Typing indicator — lets opponent see "user is coding..."
     * Purely cosmetic, no state change.
     *
     * STOMP destination: /app/room/{roomId}/typing
     */
    @MessageMapping("/room/{roomId}/typing")
    public void typing(@DestinationVariable String roomId, @Payload TypingPayload payload, SimpMessageHeaderAccessor accessor) {
        String userId = (String) accessor.getSessionAttributes().get("userId");

        simpMessagingTemplate.convertAndSend("/topic/room/"+roomId,
                RoomDto.RoomEvent.builder()
                        .type("TYPING")
                        .payload(Map.of("userId", userId, "language", payload.getLanguage()))
                        .build());
    }


    // ------------- Inner Payload ---------------------

    @lombok.Data
    public static class TypingPayload {
        private String language; // current language selection
    }



};