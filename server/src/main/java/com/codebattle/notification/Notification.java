package com.codebattle.notification;

import com.codebattle.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications",
       indexes = {
           @Index(name = "idx_notif_user", columnList = "user_id"),
           @Index(name = "idx_notif_read", columnList = "is_read"),
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Notification type — used to render the right icon/message on frontend:
     * MATCH_RESULT, RATING_UPDATE, ACHIEVEMENT, FRIEND_REQUEST,
     * FRIEND_ACCEPTED, CHALLENGE_RECEIVED, CHALLENGE_ACCEPTED,
     * CHALLENGE_DECLINED, DAILY_PROBLEM, RANK_UP, SYSTEM
     */
    @Column(nullable = false)
    private String type;

    /** Short title shown in notification list — e.g. "You won the match!" */
    @Column(nullable = false)
    private String title;

    /** Longer body text — e.g. "You beat ByteWiz and gained +24 rating" */
    @Column(columnDefinition = "TEXT")
    private String body;

    /** Optional deep-link — e.g. "/profile", "/room/XK7F2Q", "/problems/abc" */
    private String actionUrl;

    /** Optional actor — username of the person who triggered this notification */
    private String actorUsername;

    /** Optional actor avatar initial (first char of username) */
    private String actorInitial;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean read = false; // user see the notication or not  

    @CreationTimestamp
    private LocalDateTime createdAt;
}
