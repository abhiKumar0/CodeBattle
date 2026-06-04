package com.codebattle.challenge;


import com.codebattle.room.Room;
import com.codebattle.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "challenges")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Challenge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenger_id", nullable = false)
    private User challenger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenged_id", nullable = false)
    private User challenged;

    /** Room created when challenge is accepted */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ChallengeStatus status = ChallengeStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;

    /** Expires 5 minutes after creation */
    private LocalDateTime expiresAt;
}
