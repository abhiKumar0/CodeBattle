package com.codebattle.auth;

import com.codebattle.auth.dto.LoginRequest;
import com.codebattle.auth.dto.RegisterRequest;
import com.codebattle.auth.dto.AuthResponse;
import com.codebattle.auth.dto.MessageResponse;
import com.codebattle.auth.dto.PendingRegistration;
import com.codebattle.notification.EmailService;
import com.codebattle.user.Role;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;
    @Mock EmailService emailService;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;
    @Mock ObjectMapper objectMapper;

    @InjectMocks AuthService authService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = User.builder()
                .id("user-id")
                .username("abhishek")
                .email("abhi@test.com")
                .password("hashed_password")
                .rating(1200)
                .role(Role.USER)
                .build();

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    @Test
    void initiateRegistrationSuccessfully() throws Exception {
        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(objectMapper.writeValueAsString(any())).thenReturn("json_data");

        MessageResponse res = authService.initiateRegistration(RegisterRequest.builder()
                .username("newuser").email("new@test.com").password("password123")
                .build());

        assertThat(res.getMessage()).contains("Verification email sent");
        verify(emailService).sendVerificationEmail(eq("new@test.com"), eq("newuser"), anyString());
    }

    @Test
    void initiateRegistrationFailsWhenEmailTaken() {
        when(userRepository.findByEmail("abhi@test.com"))
                .thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> authService.initiateRegistration(RegisterRequest.builder()
                .username("other").email("abhi@test.com").password("pass")
                .build()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void initiateRegistrationFailsWhenUsernameTaken() {
        when(userRepository.findByUsername("abhishek"))
                .thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> authService.initiateRegistration(RegisterRequest.builder()
                .username("abhishek").email("new@test.com").password("pass")
                .build()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void newUserGetsDefaultRating() throws Exception {
        PendingRegistration pending = new PendingRegistration("newuser", "new@test.com", "hashed");
        when(valueOps.get(anyString())).thenReturn("json_data");
        when(objectMapper.readValue("json_data", PendingRegistration.class)).thenReturn(pending);
        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        when(userRepository.save(captor.capture())).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId("new-user-id");
            return u;
        });
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("token");

        AuthResponse res = authService.verifyEmail("valid-token");

        assertThat(res.getToken()).isEqualTo("token");
        assertThat(captor.getValue().getRating()).isEqualTo(1200);
        assertThat(captor.getValue().getRole()).isEqualTo(Role.USER);
        verify(emailService).sendWelcome(eq("new@test.com"), eq("newuser"));
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @Test
    void loginSuccessfullyWithCorrectCredentials() {
        when(userRepository.findByEmail("abhi@test.com"))
                .thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("password123", "hashed_password")).thenReturn(true);
        when(jwtUtil.generateToken("user-id", "abhi@test.com")).thenReturn("jwt_token");

        AuthResponse res = authService.login(LoginRequest.builder()
                .email("abhi@test.com").password("password123")
                .build());

        assertThat(res.getToken()).isEqualTo("jwt_token");
        assertThat(res.getUsername()).isEqualTo("abhishek");
    }

    @Test
    void loginFailsWithWrongPassword() {
        when(userRepository.findByEmail("abhi@test.com"))
                .thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrong", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(LoginRequest.builder()
                .email("abhi@test.com").password("wrong")
                .build()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void loginFailsWithUnknownEmail() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(LoginRequest.builder()
                .email("unknown@test.com").password("pass")
                .build()))
                .isInstanceOf(ResponseStatusException.class);
    }
}