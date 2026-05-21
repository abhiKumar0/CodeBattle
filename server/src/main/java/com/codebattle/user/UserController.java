package com.codebattle.user;

import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    /** GET /api/users/me — own profile */
    @GetMapping("/me")
    public ResponseEntity<UserProfileDto.ProfileResponse> getMe(
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    /** GET /api/users/{username} — public profile */
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto.ProfileResponse> getByUsername(
            @PathVariable String username) {
        return ResponseEntity.ok(userService.getProfileByUsername(username));
    }
}
