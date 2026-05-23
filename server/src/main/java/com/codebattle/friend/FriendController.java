package com.codebattle.friend;


import com.codebattle.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friend")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;
    private final JwtUtil jwtUtil;



    /** POST /api/friends/request/{userId} */
    @PostMapping("/request/{targetUserId}")
    public ResponseEntity<FriendDto.FriendResponse> sendRequest(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String targetUserId) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(friendService.sendRequest(userId, targetUserId));
    }


    /** PUT /api/friends/accept/{requesterId} */
    @PutMapping("/accept/{requesterId}")
    public ResponseEntity<FriendDto.FriendResponse> accept(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String requesterId) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(friendService.acceptRequest(userId, requesterId));
    }


    /** DELETE /api/friends/{friendUserId} */
    @DeleteMapping("/{friendUserId}")
    public ResponseEntity<Void> remove(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String friendUserId) {

        String userId = extractUserId(authHeader);
        friendService.removeFriend(userId, friendUserId);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/friends */
    @GetMapping
    public ResponseEntity<List<FriendDto.FriendResponse>> getFriends(
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(friendService.getFriends(userId));
    }



    /** GET /api/friends/pending */
    @GetMapping("/pending")
    public ResponseEntity<List<FriendDto.FriendResponse>> getPending(
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(friendService.getPendingRequests(userId));
    }


    private String extractUserId(String authHeader) {
        return jwtUtil.extractUserId(authHeader.replace("Bearer ", "").trim());
    }

}
