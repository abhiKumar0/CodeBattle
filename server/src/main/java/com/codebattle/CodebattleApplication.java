package com.codebattle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CodebattleApplication {

	public static void main(String[] args) {
		SpringApplication.run(CodebattleApplication.class, args);
	}

}
