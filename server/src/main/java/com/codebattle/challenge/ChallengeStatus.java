package com.codebattle.challenge;

public enum ChallengeStatus {
    PENDING,   // sent, waiting for response
    ACCEPTED,  // accepted, room created
    DECLINED,  // declined by challenged user
    EXPIRED    // not responded within 5 minutes
}
