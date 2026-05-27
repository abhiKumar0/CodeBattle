package com.codebattle.user;

import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);


    @Query("""
    SELECT CASE
        WHEN f.user.id = :userId THEN f.friend.id
        ELSE f.user.id
    END
    FROM Friend f
    WHERE (f.user.id = :userId OR f.friend.id = :userId)
    AND f.status = 'ACCEPTED'
    """)
    List<String> findFriendIds(@Param("userId") String userId);

     // NEW: prefix search for friend autocomplete (case-insensitive, exclude self, limit 10)
     @Query("""
        SELECT u FROM User u
        WHERE LOWER(u.username) LIKE LOWER(CONCAT(:prefix, '%'))
        AND u.id != :excludeId
        ORDER BY u.username ASC
        """)
    List<User> searchByUsernamePrefix(
            @Param("prefix") String prefix,
            @Param("excludeId") String excludeId,
            org.springframework.data.domain.Pageable pageable);

}

