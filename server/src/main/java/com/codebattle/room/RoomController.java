package com.codebattle.room;


import com.codebattle.auth.JwtUtil;
import com.codebattle.room.dto.RoomDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final JwtUtil jwtUtil;


    // POST /api/rooms/create
    @PostMapping("/create")
    public ResponseEntity<RoomDto.RoomResponse> create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) RoomDto.createRequest req
    ) {
        log.debug("Received request to create a room");
        String userId = extractUserId(authHeader);
        log.info("userId = {}", userId);

        RoomDto.createRequest request = (req != null) ?  req : RoomDto.createRequest.builder().build();

        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.createRoom(userId, request));
    }

    /**
     * POST /api/rooms/join/{code}
     */
    @PostMapping("/join/{code}")
    public ResponseEntity<RoomDto.RoomResponse> join(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String code) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(roomService.joinRoom(code, userId));
    }

    /**
     * POST /api/rooms/{id}/ready
     */
    @PostMapping("/{id}/ready")
    public ResponseEntity<RoomDto.RoomResponse> ready(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(roomService.setReady(id, userId));
    }


    /** DELETE /api/rooms/{id}/close  — creator closes their own room */
    @DeleteMapping("/{id}/close")
    public ResponseEntity<Void> closeRoom(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {
        String userId = extractUserId(authHeader);
        roomService.closeRoom(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/rooms/{id}/forfeit
     * Called when a player exits during an ACTIVE battle.
     * The exiting player loses — the opponent wins immediately.
     * ELO is updated the same as a normal finish.
     */
    @PostMapping("/{id}/forfeit")
    public ResponseEntity<Void> forfeit(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {
        String userId = extractUserId(authHeader);
        roomService.forfeitRoom(id, userId);
        return ResponseEntity.noContent().build();
    }


    /** GET /api/rooms/my-active — returns current user's active/waiting/created room if any */
    @GetMapping("/my-active")
    public ResponseEntity<?> getMyActiveRoom(
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return roomService.getMyActiveRoom(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }


    /**
     * GET /api/rooms/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RoomDto.RoomResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }


    /**
     * GET /api/rooms/code/{code}
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<RoomDto.RoomResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(roomService.getRoomByCode(code));
    }


    private String extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return jwtUtil.extractUserId(token);
    }


}