package com.codebattle.auth;

import com.codebattle.notification.EmailService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        if (response.isCommitted()) {
            return;
        }

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        OAuth2User oAuth2User = oauthToken.getPrincipal();

        String email = null;
        String username = null;

        if ("google".equalsIgnoreCase(registrationId)) {
            email = (String) oAuth2User.getAttributes().get("email");
            username = (String) oAuth2User.getAttributes().get("name");
            if (username == null) {
                username = (String) oAuth2User.getAttributes().get("given_name");
            }
        } else if ("github".equalsIgnoreCase(registrationId)) {
            email = (String) oAuth2User.getAttributes().get("email");
            username = (String) oAuth2User.getAttributes().get("login");
            if (email == null) {
                email = username + "@users.noreply.github.com";
            }
        }

        if (email == null) {
            email = oAuth2User.getName() + "@codebattle.com";
        }
        if (username == null) {
            username = oAuth2User.getName();
        }

        // Clean up username to be a valid profile name
        username = username.replaceAll("\\s+", "_").replaceAll("[^a-zA-Z0-9_]", "");
        if (username.isEmpty()) {
            username = "operator_" + UUID.randomUUID().toString().substring(0, 8);
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;
        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
            String baseUsername = username;
            int count = 1;
            while (userRepository.findByUsername(username).isPresent()) {
                username = baseUsername + "_" + count;
                count++;
            }

            user = User.builder()
                    .username(username)
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .build();
            userRepository.save(user);
            emailService.sendWelcome(user.getEmail(), user.getUsername());
        }

        String jwt = jwtUtil.generateToken(user.getId(), user.getEmail());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/auth/oauth-callback")
                .queryParam("token", jwt)
                .queryParam("userId", user.getId())
                .queryParam("username", user.getUsername())
                .queryParam("email", user.getEmail())
                .queryParam("rating", user.getRating())
                .queryParam("role", user.getRole().name())
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
