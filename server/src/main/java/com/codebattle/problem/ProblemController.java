package com.codebattle.problem;

import com.codebattle.problem.dto.ProblemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    /**
     * GET /api/problems
     * Optional ?difficulty=EASY|MEDIUM|HARD filter.
     */
    @GetMapping
    public ResponseEntity<List<ProblemDto.SummaryResponse>> getAll(
            @RequestParam(required = false) Difficulty difficulty) {

        List<ProblemDto.SummaryResponse> result = (difficulty != null)
                ? problemService.getProblemsByDifficulty(difficulty)
                : problemService.getAllProblems();

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/problems/daily
     * Must come before /{id} to avoid path clash.
     */
    @GetMapping("/daily")
    public ResponseEntity<ProblemDto.DetailResponse> getDaily() {
        return ResponseEntity.ok(problemService.getDailyProblem());
    }

    /**
     * GET /api/problems/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProblemDto.DetailResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.getProblemById(id));
    }

    /**
     * POST /api/problems  (admin only)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProblemDto.DetailResponse> create(
            @RequestBody ProblemDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(problemService.createProblem(request));
    }
}
