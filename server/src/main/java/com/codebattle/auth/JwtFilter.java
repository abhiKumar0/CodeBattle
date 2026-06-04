package com.codebattle.auth;


import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Key;
import java.util.Date;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String path = req.getServletPath();

        String header = req.getHeader("Authorization");
        logger.debug("Header is " + header);

        if (header == null || !header.startsWith("Bearer ")) {
            logger.warn("Missing or invalid Authorization header format");
            chain.doFilter(req, res);
            return;
        }

        String token = header.replace("Bearer ", "");
        if (!jwtUtil.isValid(token)) {
            logger.warn("Invalid JWT token");
            chain.doFilter(req, res);
            return;
        }

        String userId = jwtUtil.extractUserId(token);
        logger.debug("Extracted userId: "+ userId);
        User user = userRepository.findById(userId).orElse(null);
        logger.info("User found: " + user); // add this after findById
        if (user == null) {
            chain.doFilter(req, res);
            return;
        }

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
        SecurityContextHolder.getContext().setAuthentication(auth);

        chain.doFilter(req, res);
    }

   

}
