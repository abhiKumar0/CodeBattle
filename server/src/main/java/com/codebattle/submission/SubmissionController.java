package com.codebattle.submission;

import com.codebattle.auth.JwtUtil;
import com.codebattle.submission.dto.SubmissionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final JwtUtil jwtUtil;

    /** POST /api/submissions */
    @PostMapping
    public ResponseEntity<SubmissionDto.SubmissionResponse> submit(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody SubmissionDto.SubmitRequest req) {

        String userId = extractUserId(authHeader);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(submissionService.submit(userId, req));
    }

    /** GET /api/submissions/my */
    @GetMapping("/my")
    public ResponseEntity<List<SubmissionDto.SubmissionResponse>> getMySubmissions(
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(submissionService.getByUser(userId));
    }

    /** GET /api/submissions/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<SubmissionDto.SubmissionResponse> getById(
            @PathVariable String id) {
        return ResponseEntity.ok(submissionService.getById(id));
    }

    /** GET /api/submissions/room/{roomId} */
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<SubmissionDto.SubmissionResponse>> getByRoom(
            @PathVariable String roomId) {
        return ResponseEntity.ok(submissionService.getByRoom(roomId));
    }

    private String extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return jwtUtil.extractUserId(token);
    }
}
