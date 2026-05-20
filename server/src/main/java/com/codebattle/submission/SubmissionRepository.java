package com.codebattle.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, String> {

    List<Submission> findByRoomIdOrderBySubmittedAtAsc(String roomId); //Get all submissions of room ordered by oldest first.

    List<Submission> findByUserIdOrderBySubmittedAtDesc(String userId); // latest one  

    /** Check if a user already has an ACCEPTED submission in this room (idempotent win guard) */
    boolean existsByRoomIdAndUserIdAndStatus(String roomId, String userId, SubmissionStatus status);
}
