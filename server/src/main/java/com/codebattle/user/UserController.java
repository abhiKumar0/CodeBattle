package com.codebattle.user;

import com.codebattle.auth.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

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

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    /** PUT /api/users/me — update own profile */
    @PutMapping("/me")
    public ResponseEntity<UserProfileDto.ProfileResponse> updateMe(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody UserProfileDto.UpdateRequest request) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /** POST /api/users/me/avatar — upload profile picture */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileDto.ProfileResponse> uploadAvatar(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("file") MultipartFile file) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.updateAvatar(userId, file));
    }

    /** GET /api/users/me/history — paginated battle history */
    @GetMapping("/me/history")
    public ResponseEntity<Map<String, Object>> getBattleHistory(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.getBattleHistory(userId, page, size));
    }

    /** GET /api/users/{username} — public profile */
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto.ProfileResponse> getByUsername(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String username) {
        String currentUserId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.getProfileByUsername(username, currentUserId));
    }

    /**
     * GET /api/users/search?q=prefix
     * Returns up to 10 users whose username starts with the given prefix.
     * Used for friend search autocomplete.
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserSearchDto>> searchUsers(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("q") String query) {
        String myId = extractUserId(authHeader);
        return ResponseEntity.ok(userService.searchByUsername(query, myId));
    }

    private String extractUserId(String authHeader) {
        return jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
    }
}
