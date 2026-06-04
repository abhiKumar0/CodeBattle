package com.codebattle.achievement;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AchievementType {

    // ── Win milestones ────────────────────────────────────────────────────────
    FIRST_WIN       ("First Blood",         "Win your first match",              50),
    WIN_5           ("On a Roll",           "Win 5 matches",                     100),
    WIN_25          ("Veteran",             "Win 25 matches",                    250),
    WIN_100         ("Century",             "Win 100 matches",                   500),

    // ── Streak milestones ─────────────────────────────────────────────────────
    STREAK_3        ("Hat Trick",           "Win 3 matches in a row",            100),
    STREAK_5        ("Unstoppable",         "Win 5 matches in a row",            200),
    STREAK_10       ("Legendary",           "Win 10 matches in a row",           500),


    // ── Rating milestones ─────────────────────────────────────────────────────
    RATING_1400     ("Rising Star",         "Reach 1400 rating",                 150),
    RATING_1600     ("Expert",              "Reach 1600 rating",                 300),
    RATING_1800     ("Master",              "Reach 1800 rating",                 500),
    RATING_2000     ("Grandmaster",         "Reach 2000 rating",                 1000),



    // ── Speed milestones ──────────────────────────────────────────────────────
    SPEED_DEMON     ("Speed Demon",         "Solve a problem in under 2 minutes", 200),

    // ── Social milestones ─────────────────────────────────────────────────────
    FIRST_FRIEND    ("Social Butterfly",    "Add your first friend",              50),
    CHALLENGER      ("Challenger",          "Send 10 direct challenges",          100),



    // ── Problem milestones ────────────────────────────────────────────────────
    HARD_SOLVER     ("Hard Boiled",         "Solve a HARD difficulty problem",    300);

    private final String title;
    private final String description;
    private final int xpReward;
}
