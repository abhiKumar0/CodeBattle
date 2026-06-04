package com.codebattle.room;

import com.codebattle.problem.Problem;
import com.codebattle.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** 6-character human-readable invite code (e.g. "XK92TZ") */
    @Column(unique = true, nullable = false, length = 6)
    private String code;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RoomStatus status = RoomStatus.CREATED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opponent_id")
    private User opponent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    /** Match duration in minutes; 0 means untimed */
    @Builder.Default
    private int duration = 30;

    @Builder.Default
    private boolean creatorReady = false;

    @Builder.Default
    private boolean opponentReady = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime startedAt;

    private LocalDateTime endedAt;
}