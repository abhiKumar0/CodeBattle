package com.codebattle.room;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, String> {

    Optional<Room> findByCode(String name);

    boolean existsByCode(String name);

    @Query("""
            SELECT r FROM Room r
            WHERE r.status IN ('CREATED', 'WAITING')
            AND r.createdAt < :threshold
            """)
    List<Room> findExpiredRoom(LocalDateTime threshold);


    @Query("""
            SELECT r FROM Room r
            WHERE r.status = 'ACTIVE'
            AND (r.creator.id = :userId OR r.opponent.id = :userId)
            """)
    Optional<Room> findActiveRoomForUser(String userId);


    @Query("""
            SELECT r FROM Room r
            WHERE r.status IN ('CREATED', 'WAITING', 'ACTIVE')
            AND (r.creator.id = :userId OR r.opponent.id = :userId)
            ORDER BY r.createdAt DESC
            """)
    Optional<Room> findAnyOpenRoomForUser(String userId);


    @Query(value = """
            SELECT r FROM Room r
            LEFT JOIN FETCH r.creator
            LEFT JOIN FETCH r.opponent
            LEFT JOIN FETCH r.problem
            LEFT JOIN FETCH r.winner
            WHERE r.status = 'FINISHED'
            AND (r.creator.id = :userId OR r.opponent.id = :userId)
            ORDER BY r.endedAt DESC
            """,
            countQuery = """
            SELECT COUNT(r) FROM Room r
            WHERE r.status = 'FINISHED'
            AND (r.creator.id = :userId OR r.opponent.id = :userId)
            """)
    Page<Room> findFinishedRoomsByUserId(
            @Param("userId") String userId,
            Pageable pageable);

}
