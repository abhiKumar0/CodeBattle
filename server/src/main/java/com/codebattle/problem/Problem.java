package com.codebattle.problem;

import jakarta.persistence.*; // use for dataa base annotatoion
import lombok.*;
import org.hibernate.annotations.CreationTimestamp; // store creation time

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity // tell that this calls should be a table in db
@Table(name = "problems")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING) // store enum in string format
    @Column(nullable = false)
    private Difficulty difficulty;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT") // text allow to store large description
    private String inputFormat;

    @Column(columnDefinition = "TEXT")
    private String outputFormat;

    @Column(columnDefinition = "TEXT")
    private String constraints;

    // Time limit in milliseconds
    @Builder.Default // use4 to use the inilaized value of the variable  in builder
    private int timeLimit = 2000;

    // Memory limit in MB
    @Builder.Default
    private int memoryLimit = 256;

    @Builder.Default
    private boolean isDaily = false;

    private String topic;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    // mapped with the problem and if problem dele remove  all test case to maintians conssitency  and if remove testcase then remove from db als0
    @Builder.Default
    private List<TestCase> testCases = new ArrayList<>();

    // Helper to keep bidirectional relationship consistent
    public void addTestCase(TestCase testCase) {
        testCases.add(testCase);
        testCase.setProblem(this);
    }
}
