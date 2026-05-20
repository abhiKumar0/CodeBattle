package com.codebattle.problem;

import com.codebattle.problem.dto.ProblemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;

    // ─── Queries ─────────────────────────────────────────────────────────────

    public List<ProblemDto.SummaryResponse> getAllProblems() {
        return problemRepository.findAll()
                .stream()
                .map(this::toSummary)
                .toList();
    }

    public List<ProblemDto.SummaryResponse> getProblemsByDifficulty(Difficulty difficulty) {
        return problemRepository.findByDifficulty(difficulty)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    public ProblemDto.DetailResponse getProblemById(String id) {
        Problem problem = findOrThrow(id);
        return toDetail(problem);
    }

    public ProblemDto.DetailResponse getDailyProblem() {
        Problem daily = problemRepository.findLatestDaily()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No daily problem set for today"));
        return toDetail(daily);
    }

    // ─── Admin mutations ──────────────────────────────────────────────────────

    @Transactional
    public ProblemDto.DetailResponse createProblem(ProblemDto.CreateRequest req) {
        if (problemRepository.existsByTitle(req.getTitle())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Problem with this title already exists");
        }

        Problem problem = Problem.builder()
                .title(req.getTitle())
                .difficulty(req.getDifficulty())
                .description(req.getDescription())
                .inputFormat(req.getInputFormat())
                .outputFormat(req.getOutputFormat())
                .constraints(req.getConstraints())
                .timeLimit(req.getTimeLimit() > 0 ? req.getTimeLimit() : 2000)
                .memoryLimit(req.getMemoryLimit() > 0 ? req.getMemoryLimit() : 256)
                .isDaily(req.isDaily())
                .topic(req.getTopic())
                .build();

        if (req.getTestCases() != null) {
            req.getTestCases().forEach(tc -> {
                TestCase testCase = TestCase.builder()
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .isHidden(tc.isHidden())
                        .build();
                problem.addTestCase(testCase);
            });
        }

        return toDetail(problemRepository.save(problem));
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

   public   Problem findOrThrow(String id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Problem not found: " + id));
    }

    private ProblemDto.SummaryResponse toSummary(Problem p) {
        return ProblemDto.SummaryResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .difficulty(p.getDifficulty())
                .topic(p.getTopic())
                .isDaily(p.isDaily())
                .build();
    }

    private ProblemDto.DetailResponse toDetail(Problem p) {
        List<ProblemDto.TestCaseResponse> samples = p.getTestCases().stream()
                .filter(tc -> !tc.isHidden())
                .map(tc -> ProblemDto.TestCaseResponse.builder()
                        .id(tc.getId())
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .build())
                .toList();

        return ProblemDto.DetailResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .difficulty(p.getDifficulty())
                .description(p.getDescription())
                .inputFormat(p.getInputFormat())
                .outputFormat(p.getOutputFormat())
                .constraints(p.getConstraints())
                .timeLimit(p.getTimeLimit())
                .memoryLimit(p.getMemoryLimit())
                .isDaily(p.isDaily())
                .topic(p.getTopic())
                .createdAt(p.getCreatedAt())
                .sampleTestCases(samples)
                .build();
    }
}
