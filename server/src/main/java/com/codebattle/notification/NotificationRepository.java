package com.codebattle.notification;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    // Latest notifications for a user (paginated)
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    // Unread count
    long countByUserIdAndReadFalse(String userId);  // list of all unread notifictaion 

    // Mark all as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    void markAllReadForUser(String userId);

    // Mark single as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true WHERE n.id = :id AND n.user.id = :userId")
    void markOneRead(String id, String userId);

    // Delete old read notifications (cleanup scheduler)
    @Modifying
    @Transactional
    @Query("""
        DELETE FROM Notification n
        WHERE n.user.id = :userId
        AND n.read = true
        AND n.createdAt < CURRENT_TIMESTAMP - 30 DAY
        """)
    void deleteOldReadForUser(String userId);
}
