package com.codebattle.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendRepository extends JpaRepository<Friend, String> {

    /** All accepted friends for a user (either direction) */
    @Query("""
            SELECT f FROM Friend f
            WHERE (f.user.id = :userId OR f.friend.id = :userId)
            AND f.status = 'ACCEPTED'
            """)
    List<Friend> findAcceptedFriends(String userId);

    /** Incoming pending requests */
    @Query("""
            SELECT f FROM Friend f
            WHERE f.friend.id = :userId
            AND f.status = 'PENDING'
            """)
    List<Friend> findPendingRequests(String userId);

    /** Find the row between two users regardless of who sent it */
    @Query("""
            SELECT f FROM Friend f
            WHERE (f.user.id = :userA AND f.friend.id = :userB)
            OR    (f.user.id = :userB AND f.friend.id = :userA)
            """)
    Optional<Friend> findBetween(String userA, String userB);


    /** For UserRepository.findFriendIds() — returns the other user's ID */
    @Query("""
            SELECT CASE
                WHEN f.user.id = :userId THEN f.friend.id
                ELSE f.user.id
            END
            FROM Friend f
            WHERE (f.user.id = :userId OR f.friend.id = :userId)
            AND f.status = 'ACCEPTED'
            """)
    List<String> findFriendIds(String userId);
}
