package com.codebattle.config;

import com.codebattle.auth.JwtUtil;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        // Read STOMP headers from incoming WebSocket frame
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        // Authenticate only when socket first connects
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {

                String token = authHeader.substring(7);

                try {
                    String userId = jwtUtil.extractUserId(token);
                    
                    User user = userRepository.findById(userId).orElse(null);
                    String role = (user != null) ? user.getRole().name() : "USER";
                    // Create authenticated Spring Security user
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    userId,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );

                    // Save userId for later use in @MessageMapping
                    accessor.getSessionAttributes().put("userId", userId);

                    // Attach logged-in user to this socket session
                    accessor.setUser(auth);

                    log.debug("WebSocket authenticated: {}", userId);

                } catch (Exception e) {
                    // Bad/expired token -> connection stays unauthenticated
                    log.warn("WebSocket JWT invalid: {}", e.getMessage());
                }
            }
        }

        // Block subscriptions to the removed spectate code topic
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String dest = accessor.getDestination();
            if (dest != null && dest.startsWith("/topic/spectate/")) {
                log.warn("Blocked subscription to removed spectate code topic: {}", dest);
                return null;
            }
        }

        return message;
    }
}