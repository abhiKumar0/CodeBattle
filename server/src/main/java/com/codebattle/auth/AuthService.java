package com.codebattle.auth;


import com.codebattle.auth.dto.*;
import com.codebattle.notification.EmailService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String VERIFY_PREFIX = "email-verify:";
    private static final String LOOKUP_PREFIX = "email-verify-lookup:";
    private static final long TOKEN_TTL_MINUTES = 15;

    // ─── Step 1: Initiate registration (no User created yet) ─────────────────

    public MessageResponse initiateRegistration(RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        // If there's already a pending verification for this email, delete the old one
        String existingToken = redisTemplate.opsForValue().get(LOOKUP_PREFIX + request.getEmail());
        if (existingToken != null) {
            redisTemplate.delete(VERIFY_PREFIX + existingToken);
            redisTemplate.delete(LOOKUP_PREFIX + request.getEmail());
        }

        String token = UUID.randomUUID().toString();
        PendingRegistration pending = new PendingRegistration(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword())
        );

        try {
            String json = objectMapper.writeValueAsString(pending);
            redisTemplate.opsForValue().set(VERIFY_PREFIX + token, json, TOKEN_TTL_MINUTES, TimeUnit.MINUTES);
            redisTemplate.opsForValue().set(LOOKUP_PREFIX + request.getEmail(), token, TOKEN_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize pending registration: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Registration failed");
        }

        emailService.sendVerificationEmail(request.getEmail(), request.getUsername(), token);
        log.info("Verification email sent to {} for username {}", request.getEmail(), request.getUsername());

        return new MessageResponse("Verification email sent. Please check your inbox.");
    }

    // ─── Step 2: Verify email and create User ────────────────────────────────

    public AuthResponse verifyEmail(String token) {
        String json = redisTemplate.opsForValue().get(VERIFY_PREFIX + token);
        if (json == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification token");
        }

        PendingRegistration pending;
        try {
            pending = objectMapper.readValue(json, PendingRegistration.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize pending registration: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Verification failed");
        }

        // Re-check uniqueness — someone else may have registered while token was pending
        if (userRepository.findByUsername(pending.getUsername()).isPresent()) {
            redisTemplate.delete(VERIFY_PREFIX + token);
            redisTemplate.delete(LOOKUP_PREFIX + pending.getEmail());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }
        if (userRepository.findByEmail(pending.getEmail()).isPresent()) {
            redisTemplate.delete(VERIFY_PREFIX + token);
            redisTemplate.delete(LOOKUP_PREFIX + pending.getEmail());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        User user = User.builder()
                .username(pending.getUsername())
                .email(pending.getEmail())
                .password(pending.getHashedPassword())
                .build();

        userRepository.save(user);

        // Clean up Redis
        redisTemplate.delete(VERIFY_PREFIX + token);
        redisTemplate.delete(LOOKUP_PREFIX + pending.getEmail());

        emailService.sendWelcome(user.getEmail(), user.getUsername());
        String jwt = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), user.getRating(), user.getRole().name());
    }

    // ─── Resend verification email ───────────────────────────────────────────

    public MessageResponse resendVerification(String email) {
        String token = redisTemplate.opsForValue().get(LOOKUP_PREFIX + email);
        if (token == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No pending registration found for this email");
        }

        String json = redisTemplate.opsForValue().get(VERIFY_PREFIX + token);
        if (json == null) {
            redisTemplate.delete(LOOKUP_PREFIX + email);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No pending registration found for this email");
        }

        PendingRegistration pending;
        try {
            pending = objectMapper.readValue(json, PendingRegistration.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process request");
        }

        emailService.sendVerificationEmail(pending.getEmail(), pending.getUsername(), token);
        log.info("Verification email resent to {}", email);

        return new MessageResponse("Verification email resent. Please check your inbox.");
    }

    // ─── Login (unchanged) ───────────────────────────────────────────────────

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail(), user.getRating(), user.getRole().name());
    }

    // ─── Forgot password ─────────────────────────────────────────────────────

    private static final String RESET_PREFIX = "password-reset:";
    private static final String RESET_LOOKUP_PREFIX = "password-reset-lookup:";
    private static final long RESET_TTL_MINUTES = 15;

    public MessageResponse forgotPassword(String email) {
        // Always return success to prevent email enumeration
        userRepository.findByEmail(email).ifPresent(user -> {
            // Delete any existing reset token for this email
            String existingToken = redisTemplate.opsForValue().get(RESET_LOOKUP_PREFIX + email);
            if (existingToken != null) {
                redisTemplate.delete(RESET_PREFIX + existingToken);
                redisTemplate.delete(RESET_LOOKUP_PREFIX + email);
            }

            String token = UUID.randomUUID().toString();
            redisTemplate.opsForValue().set(RESET_PREFIX + token, email, RESET_TTL_MINUTES, TimeUnit.MINUTES);
            redisTemplate.opsForValue().set(RESET_LOOKUP_PREFIX + email, token, RESET_TTL_MINUTES, TimeUnit.MINUTES);

            emailService.sendPasswordReset(email, user.getUsername(), token);
            log.info("Password reset email sent to {}", email);
        });

        return new MessageResponse("If an account with that email exists, a reset link has been sent.");
    }

    // ─── Reset password ──────────────────────────────────────────────────────

    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String email = redisTemplate.opsForValue().get(RESET_PREFIX + request.getToken());
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Clean up Redis
        redisTemplate.delete(RESET_PREFIX + request.getToken());
        redisTemplate.delete(RESET_LOOKUP_PREFIX + email);

        log.info("Password reset successful for {}", email);
        return new MessageResponse("Password reset successful. You can now log in with your new password.");
    }
}
