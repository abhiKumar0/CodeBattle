package com.codebattle.achievement;


import com.codebattle.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "achievements",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "type"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Achievement {


    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AchievementType type;

    @CreationTimestamp
    private LocalDateTime unlockedAt;
}
