package com.codebattle.auth;


import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    public JwtUtil(UserRepository userRepository) {
    }


    private Key getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String userId, String email) {
        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()+expiration))
                .signWith(getKey())
                .compact();
    }

    public String extractUserId(String token) {
        return getClaims(token).getSubject();
    }
    public String extractEmail(String token) {
        return getClaims(token).get("email").toString();
    }



    public boolean isValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // public String extractUsername(String token) {
    //     Claims claims = Jwts.parserBuilder()
    //             .setSigningKey(getSigningKey())
    //             .build()
    //             .parseClaimsJws(token)
    //             .getBody();
    //     // Username stored in the "sub" claim as userId,
    //     // so we need to look up by userId — OR store username in token.
    //     // Simplest fix: add username to token claims in generateToken():
    //     //
    //     // In generateToken(String userId, String email):
    //     //   .claim("username", username)   ← add this param + claim
    //     //
    //     // OR just use the email claim and look up:
    //     String email = claims.get("email", String.class);
    //     return userRepository.findByEmail(email)
    //             .map(User::getUsername)
    //             .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    // }

}
