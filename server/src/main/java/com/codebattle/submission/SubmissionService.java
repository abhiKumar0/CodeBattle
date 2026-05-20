package com.codebattle.submission;

import com.codebattle.problem.Problem;
import com.codebattle.problem.ProblemService;
import com.codebattle.problem.TestCase;
import com.codebattle.room.Room;
import com.codebattle.room.RoomService;
import com.codebattle.room.RoomStatus;
import com.codebattle.submission.dto.SubmissionDto;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final ProblemService problemService;
    private final RoomService roomService;
    private final Judge0Client judge0Client;
    private final SimpMessagingTemplate messagingTemplate;

    private static final int POLL_INTERVAL_MS = 1500;
    private static final int MAX_POLLS        = 20;   // 30 seconds max wait

    // ─── Submit 
    @Transactional
    public SubmissionDto.SubmissionResponse submit(String userId, SubmissionDto.SubmitRequest req) {
        User user = findUserOrThrow(userId);
        Room room = roomService.findByIdOrThrow(req.getRoomId());
        Problem problem = problemService.findOrThrow(req.getProblemId());

        // Room must be active
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Room is not active");
        }

        // User must be a participant
        boolean isParticipant = room.getCreator().getId().equals(userId)
                || (room.getOpponent() != null && room.getOpponent().getId().equals(userId));
        if (!isParticipant) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not a participant of this room");
        }

        // Idempotent — don't accept another submission if already won
        if (submissionRepository.existsByRoomIdAndUserIdAndStatus(
                req.getRoomId(), userId, SubmissionStatus.ACCEPTED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You have already solved this problem");
        }

        Submission submission = Submission.builder()
                .room(room)
                .user(user)
                .problem(problem)
                .code(req.getCode())
                .language(req.getLanguage())
                .status(SubmissionStatus.PENDING)
                .build();

        Submission saved = submissionRepository.save(submission);

        // Broadcast to room: opponent knows you're running
        broadcastEvent(req.getRoomId(), SubmissionDto.SubmissionEvent.builder()
                .type("SUBMISSION_RUNNING")
                .submissionId(saved.getId())
                .userId(userId)
                .username(user.getUsername())
                .status(SubmissionStatus.RUNNING)
                .build());

        // Hand off to async thread — don't block the HTTP response
        runJudge0Async(saved.getId(), problem, req.getCode(), req.getLanguage());

        return toResponse(saved);
    }

    // ─── Async Judge0 execution 

    @Async
    public void runJudge0Async(String submissionId, Problem problem,
                                String code, String language) {
        try {
            List<TestCase> testCases = problem.getTestCases();
            if (testCases.isEmpty()) {
                updateStatus(submissionId, SubmissionStatus.RUNTIME_ERROR,
                        null, null, "No test cases defined for this problem");
                return;
            }

            SubmissionStatus finalStatus = SubmissionStatus.ACCEPTED;
            Integer totalTimeMs = 0;
            Integer maxMemoryKb = 0;
            String errorMsg = null;

            for (TestCase tc : testCases) {
                String token = judge0Client.submit(
                        code, language, tc.getInput(),
                        problem.getTimeLimit(), problem.getMemoryLimit());

                Judge0Client.Judge0Result result = poll(token); // check untill get the result max 20 try  and wait 1.5sec 

                if (result == null) {
                    finalStatus = SubmissionStatus.TIME_LIMIT_EXCEEDED;
                    errorMsg = "Judge timed out";
                    break;
                }

                // Track resource usage across all test cases
                if (result.getTimeSeconds() != null)
                    totalTimeMs += (int) (result.getTimeSeconds() * 1000);
                if (result.getMemoryKb() != null)
                    maxMemoryKb = Math.max(maxMemoryKb, result.getMemoryKb());

                if (result.isCompileError()) {
                    finalStatus = SubmissionStatus.COMPILE_ERROR;
                    errorMsg = result.getCompileOutput();
                    break;
                }
                if (result.isTLE()) {
                    finalStatus = SubmissionStatus.TIME_LIMIT_EXCEEDED;
                    break;
                }
                if (result.isRuntimeError()) {
                    finalStatus = SubmissionStatus.RUNTIME_ERROR;
                    errorMsg = result.getStderr();
                    break;
                }
                if (result.isWrongAnswer() || !outputMatches(result.getStdout(), tc.getExpectedOutput())) {
                    finalStatus = SubmissionStatus.WRONG_ANSWER;
                    break;
                }
            }

            updateStatus(submissionId, finalStatus, totalTimeMs, maxMemoryKb, errorMsg);

        } catch (Exception e) {
            log.error("Judge0 execution failed for submission {}: {}", submissionId, e.getMessage());
            updateStatus(submissionId, SubmissionStatus.RUNTIME_ERROR,
                    null, null, "Internal judge error: " + e.getMessage());
        }
    }

    // ─── Status update + broadcast + win detection 

    @Transactional
    public void updateStatus(String submissionId, SubmissionStatus status,
                              Integer executionTimeMs, Integer memoryKb, String errorMsg) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found: " + submissionId));

        submission.setStatus(status);
        submission.setExecutionTime(executionTimeMs);
        submission.setMemoryUsed(memoryKb);
        submission.setErrorMessage(errorMsg);
        submissionRepository.save(submission);

        // Broadcast result to room
        broadcastEvent(submission.getRoom().getId(), SubmissionDto.SubmissionEvent.builder()
                .type("SUBMISSION_RESULT")
                .submissionId(submissionId)
                .userId(submission.getUser().getId())
                .username(submission.getUser().getUsername())
                .status(status)
                .executionTime(executionTimeMs)
                .memoryUsed(memoryKb)
                .errorMessage(errorMsg)
                .build());

        // First ACCEPTED in the room = winner
        if (status == SubmissionStatus.ACCEPTED) {
            roomService.finishRoom(submission.getRoom().getId(),
                    submission.getUser().getId());
        }
    }

    // ─── Queries 

    public SubmissionDto.SubmissionResponse getById(String id) {
        return toResponse(submissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Submission not found: " + id)));
    }

    public List<SubmissionDto.SubmissionResponse> getByRoom(String roomId) {
        return submissionRepository.findByRoomIdOrderBySubmittedAtAsc(roomId)
                .stream().map(this::toResponse).toList();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Poll Judge0 until result is ready or MAX_POLLS exceeded */
    private Judge0Client.Judge0Result poll(String token) throws InterruptedException {
        for (int i = 0; i < MAX_POLLS; i++) {
            Thread.sleep(POLL_INTERVAL_MS);
            Judge0Client.Judge0Result result = judge0Client.getResult(token);
            if (result != null) return result;
        }
        return null; // timed out
    }

    /** Normalize whitespace before comparing output */
    private boolean outputMatches(String actual, String expected) {
        if (actual == null) return false;
        return actual.trim().equals(expected.trim());
    }

    private void broadcastEvent(String roomId, SubmissionDto.SubmissionEvent event) {
        messagingTemplate.convertAndSend("/topic/match/" + roomId, event);
    }

    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }

    private SubmissionDto.SubmissionResponse toResponse(Submission s) {
        return SubmissionDto.SubmissionResponse.builder()
                .id(s.getId())
                .roomId(s.getRoom().getId())
                .userId(s.getUser().getId())
                .username(s.getUser().getUsername())
                .problemId(s.getProblem().getId())
                .language(s.getLanguage())
                .status(s.getStatus())
                .executionTime(s.getExecutionTime())
                .memoryUsed(s.getMemoryUsed())
                .errorMessage(s.getErrorMessage())
                .submittedAt(s.getSubmittedAt())
                .build();
    }
}
