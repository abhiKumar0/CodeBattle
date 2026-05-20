package com.codebattle.submission;

import com.codebattle.problem.Problem;
import com.codebattle.room.Room;
import com.codebattle.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY) // as many submission can belong to one room 
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY) // same many sub ca belong to one user 
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String code; // store the submitted code  in db

    @Column(nullable = false)
    private String language;  // e.g. "java", "python", "cpp"

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.PENDING; // default pending

    private Integer executionTime;  // ms

    private Integer memoryUsed;     // KB

    /** Raw stderr / judge message for debugging */
    @Column(columnDefinition = "TEXT")
    private String errorMessage; 

    @CreationTimestamp
    private LocalDateTime submittedAt;
}
