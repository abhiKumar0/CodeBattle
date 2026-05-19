package com.codebattle.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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


}
