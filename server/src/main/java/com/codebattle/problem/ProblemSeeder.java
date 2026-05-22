package com.codebattle.problem;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.codebattle.leaderboard.LeaderboardService;

import java.util.List;

/**
 * Seeds 10 classic problems (with test cases) on first startup.
 * Skips seeding if problems already exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProblemSeeder implements CommandLineRunner {

    private final ProblemRepository problemRepository;
    private final LeaderboardService leaderboardService;

    @Override
    @Transactional
    public void run(String... args) { // only run when the sprring start
        if (problemRepository.count() > 0) {
            log.info("Problems already seeded — skipping.");
            return;
        }

        List<Problem> problems = List.of(
                // ── 1. Two Sum (EASY, Arrays) ──────────────────────────────
                buildProblem(
                        "Two Sum",
                        Difficulty.EASY,
                        "arrays",
                        false,
                        """
                        Given an array of integers `nums` and an integer `target`, return the \
                        indices of the two numbers that add up to `target`.
                        You may assume each input has exactly one solution, and you may not use \
                        the same element twice.
                        """,
                        "Line 1: n (array size)\nLine 2: n space-separated integers\nLine 3: target",
                        "Two space-separated indices (0-indexed), in any order.",
                        "1 ≤ n ≤ 10^4, -10^9 ≤ nums[i] ≤ 10^9",
                        List.of(
                                tc("4\n2 7 11 15\n9", "0 1", false),
                                tc("3\n3 2 4\n6", "1 2", false),
                                tc("5\n1 5 3 7 2\n9", "1 3", true),
                                tc("6\n-3 4 3 90 -1 0\n0", "0 2", true)
                        )
                ),

                // ── 2. Valid Parentheses (EASY, Stacks) ───────────────────
                buildProblem(
                        "Valid Parentheses",
                        Difficulty.EASY,
                        "stacks",
                        false,
                        """
                        Given a string `s` containing only '(', ')', '{', '}', '[' and ']', \
                        determine if the input string is valid.
                        An input string is valid if open brackets are closed by the same type \
                        of brackets and in the correct order.
                        """,
                        "A single string s.",
                        "Print \"true\" if valid, \"false\" otherwise.",
                        "1 ≤ |s| ≤ 10^4",
                        List.of(
                                tc("()", "true", false),
                                tc("()[]{}", "true", false),
                                tc("(]", "false", false),
                                tc("{[]}", "true", true),
                                tc("([)]", "false", true)
                        )
                ),

                // ── 3. Longest Substring Without Repeating Characters (MEDIUM, Sliding Window) ──
                buildProblem(
                        "Longest Substring Without Repeating Characters",
                        Difficulty.MEDIUM,
                        "sliding-window",
                        true,   // daily
                        """
                        Given a string `s`, find the length of the longest substring \
                        without repeating characters.
                        """,
                        "A single string s.",
                        "A single integer — the length of the longest substring.",
                        "0 ≤ |s| ≤ 5 × 10^4, s consists of printable ASCII characters.",
                        List.of(
                                tc("abcabcbb", "3", false),
                                tc("bbbbb", "1", false),
                                tc("pwwkew", "3", false),
                                tc("", "0", true),
                                tc("dvdf", "3", true)
                        )
                ),

                // ── 4. Maximum Subarray (MEDIUM, DP / Kadane) ─────────────
                buildProblem(
                        "Maximum Subarray",
                        Difficulty.MEDIUM,
                        "dp",
                        false,
                        """
                        Given an integer array `nums`, find the subarray with the largest sum \
                        and return its sum.
                        """,
                        "Line 1: n\nLine 2: n space-separated integers",
                        "A single integer — the maximum subarray sum.",
                        "1 ≤ n ≤ 10^5, -10^4 ≤ nums[i] ≤ 10^4",
                        List.of(
                                tc("9\n-2 1 -3 4 -1 2 1 -5 4", "6", false),
                                tc("1\n1", "1", false),
                                tc("5\n5 4 -1 7 8", "23", false),
                                tc("4\n-3 -1 -2 -4", "-1", true),
                                tc("6\n-2 -3 4 -1 -2 1", "2", true)
                        )
                ),

                // ── 5. Binary Search (EASY, Binary Search) ────────────────
                buildProblem(
                        "Binary Search",
                        Difficulty.EASY,
                        "binary-search",
                        false,
                        """
                        Given an array of integers `nums` sorted in ascending order and a \
                        `target` integer, return the index of target. If it does not exist, \
                        return -1.
                        """,
                        "Line 1: n\nLine 2: n sorted integers\nLine 3: target",
                        "Index of target or -1.",
                        "1 ≤ n ≤ 10^4, -10^4 ≤ nums[i] ≤ 10^4 (all distinct)",
                        List.of(
                                tc("6\n-1 0 3 5 9 12\n9", "4", false),
                                tc("6\n-1 0 3 5 9 12\n2", "-1", false),
                                tc("1\n5\n5", "0", true),
                                tc("4\n1 3 5 7\n3", "1", true)
                        )
                ),

                // ── 6. Number of Islands (MEDIUM, Graphs / BFS) ───────────
                buildProblem(
                        "Number of Islands",
                        Difficulty.MEDIUM,
                        "graphs",
                        false,
                        """
                        Given an m×n grid of '1' (land) and '0' (water), return the number \
                        of islands. An island is surrounded by water and is formed by connecting \
                        adjacent lands horizontally or vertically.
                        """,
                        "Line 1: m n\nLines 2..m+1: n characters per line ('0' or '1')",
                        "A single integer — number of islands.",
                        "1 ≤ m, n ≤ 300",
                        List.of(
                                tc("4 5\n11110\n11010\n11000\n00000", "1", false),
                                tc("4 5\n11000\n11000\n00100\n00011", "3", false),
                                tc("1 1\n1", "1", true),
                                tc("2 2\n00\n00", "0", true)
                        )
                ),

                // ── 7. Climbing Stairs (EASY, DP / Fibonacci) ─────────────
                buildProblem(
                        "Climbing Stairs",
                        Difficulty.EASY,
                        "dp",
                        false,
                        """
                        You are climbing a staircase with `n` steps. Each time you can climb \
                        either 1 or 2 steps. In how many distinct ways can you reach the top?
                        """,
                        "A single integer n.",
                        "Number of distinct ways.",
                        "1 ≤ n ≤ 45",
                        List.of(
                                tc("2", "2", false),
                                tc("3", "3", false),
                                tc("1", "1", true),
                                tc("10", "89", true)
                        )
                ),

                // ── 8. Merge Intervals (MEDIUM, Sorting) ──────────────────
                buildProblem(
                        "Merge Intervals",
                        Difficulty.MEDIUM,
                        "sorting",
                        false,
                        """
                        Given an array of intervals, merge all overlapping intervals and return \
                        an array of the non-overlapping intervals that cover all the intervals \
                        in the input.
                        """,
                        "Line 1: n (number of intervals)\nLines 2..n+1: two integers per line (start end)",
                        "Each line: two integers per merged interval.",
                        "1 ≤ n ≤ 10^4, 0 ≤ start ≤ end ≤ 10^4",
                        List.of(
                                tc("4\n1 3\n2 6\n8 10\n15 18", "1 6\n8 10\n15 18", false),
                                tc("2\n1 4\n4 5", "1 5", false),
                                tc("1\n5 5", "5 5", true),
                                tc("3\n1 4\n0 2\n3 5", "0 5", true)
                        )
                ),

                // ── 9. Word Search (MEDIUM, Backtracking) ─────────────────
                buildProblem(
                        "Word Search",
                        Difficulty.MEDIUM,
                        "backtracking",
                        false,
                        """
                        Given an m×n grid of characters and a string `word`, return true if \
                        the word exists in the grid. The word can be constructed from letters \
                        of sequentially adjacent cells (horizontally or vertically adjacent). \
                        The same cell may not be used more than once.
                        """,
                        "Line 1: m n\nLines 2..m+1: n characters per row\nLast line: word",
                        "\"true\" or \"false\"",
                        "1 ≤ m, n ≤ 6, 1 ≤ |word| ≤ 15",
                        List.of(
                                tc("3 4\nABCE\nSFCS\nADEE\nSEE", "true", false),
                                tc("3 4\nABCE\nSFCS\nADEE\nABCB", "false", false),
                                tc("1 1\nA\nA", "true", true),
                                tc("2 2\nAB\nCD\nDCBA", "false", true)
                        )
                ),

                // ── 10. Trapping Rain Water (HARD, Two Pointers) ──────────
                buildProblem(
                        "Trapping Rain Water",
                        Difficulty.HARD,
                        "two-pointers",
                        false,
                        """
                        Given `n` non-negative integers representing an elevation map where the \
                        width of each bar is 1, compute how much water it can trap after raining.
                        """,
                        "Line 1: n\nLine 2: n space-separated integers (heights)",
                        "A single integer — total water trapped.",
                        "1 ≤ n ≤ 2 × 10^4, 0 ≤ height[i] ≤ 10^5",
                        List.of(
                                tc("12\n0 1 0 2 1 0 1 3 2 1 2 1", "6", false),
                                tc("6\n4 2 0 3 2 5", "9", false),
                                tc("1\n0", "0", true),
                                tc("5\n3 0 2 0 4", "7", true),
                                tc("4\n1 0 1 0", "1", true)
                        )
                )
        );

        problemRepository.saveAll(problems);
        log.info("Seeded {} problems successfully.", problems.size());
        leaderboardService.seedFromDatabase();
    }

    // ─── Builders ─────────────────────────────────────────────────────────────

    private Problem buildProblem(String title, Difficulty difficulty, String topic,
                                 boolean isDaily, String description,
                                 String inputFormat, String outputFormat,
                                 String constraints, List<TestCase> testCases) {
        Problem p = Problem.builder()
                .title(title)
                .difficulty(difficulty)
                .topic(topic)
                .isDaily(isDaily)
                .description(description.stripIndent().trim())
                .inputFormat(inputFormat)
                .outputFormat(outputFormat)
                .constraints(constraints)
                .timeLimit(2000)
                .memoryLimit(256)
                .build();

        testCases.forEach(p::addTestCase);
        return p;
    }

    private TestCase tc(String input, String expectedOutput, boolean hidden) {
        return TestCase.builder()
                .input(input)
                .expectedOutput(expectedOutput)
                .isHidden(hidden)
                .build();
    }
}
