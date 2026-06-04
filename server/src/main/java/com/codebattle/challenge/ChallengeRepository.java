package com.codebattle.challenge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ChallengeRepository extends JpaRepository<Challenge, String> {


    /** Pending challenges older than threshold — for expiry scheduler */
    @Query("""
            SELECT c FROM Challenge c
            WHERE c.status = 'PENDING'
            AND c.expiresAt < :now
            """)
    List<Challenge> findExpired(LocalDateTime now);

    /** Active pending challenge between two specific users */
    @Query("""
            SELECT c FROM Challenge c
            WHERE c.challenger.id = :challengerId
            AND c.challenged.id  = :challengedId
            AND c.status = 'PENDING'
            """)
    List<Challenge> findPendingBetween(String challengerId, String challengedId);


    @Query("""
    SELECT c FROM Challenge c
    WHERE c.challenger.id = :userId OR c.challenged.id = :userId
    ORDER BY c.createdAt DESC
    """)
    List<Challenge> findByUserId(String userId);
}
