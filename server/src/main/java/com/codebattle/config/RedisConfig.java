package com.codebattle.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Spring Boot auto-configures RedisConnectionFactory from:
 *   spring.data.redis.url=rediss://default:<password>@<host>:<port>
 *
 * rediss:// (double-s) enables SSL automatically — required for Upstash.
 * We just expose StringRedisTemplate for injection across services.
 */
@Configuration
public class RedisConfig {
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }
}
