package com.codebattle.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

//     // Add this query for friends leaderboard filtering:
@Query("""
    SELECT f.friendId FROM Friend f
    WHERE f.userId = :userId AND f.status = 'ACCEPTED'
    """)
List<String> findFriendIds(String userId);
 }

