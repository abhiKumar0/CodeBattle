package com.codebattle.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;


/**
 * Listens to WebSocket session lifecycle events.
 * Useful for tracking online presence (Phase 5 will extend this with Redis).
 */

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null ? accessor.getUser().getName() : "anonymous";

        log.info("WebSocket connected: {} (session: {})", username, accessor.getSessionId());
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null ? accessor.getUser().getName() : "anonymous";
        String sessionId = accessor.getSessionId();

        log.info("WebSocket disconnected: {} (session: {})", username, sessionId);

        // Phase 5 hook: remove from Redis presence set here
        // presenceService.markOffline(username);
    }
}
