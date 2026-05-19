package com.codebattle.problem;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, String> {

    List<Problem> findByDifficulty(Difficulty difficulty); // serch the sql query with the diffiiculty

    List<Problem> findByTopic(String topic);

    // value may or may not be exist
    Optional<Problem> findByIsDaily(boolean isDaily);
    // return  latest daily problem
    @Query("SELECT p FROM Problem p WHERE p.isDaily = true ORDER BY p.createdAt DESC LIMIT 1")
    Optional<Problem> findLatestDaily();

    boolean existsByTitle(String title);
}
