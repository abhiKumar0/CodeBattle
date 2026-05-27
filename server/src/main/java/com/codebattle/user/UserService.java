package com.codebattle.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.
ResponseStatusException;
import com.codebattle.user.UserSearchDto;
import org.springframework.data.domain.PageRequest;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserProfileDto.ProfileResponse getProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
        return toProfile(user);
    }

    public UserProfileDto.ProfileResponse getProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
        return toProfile(user);
    }

    public UserProfileDto.ProfileResponse toProfile(User user) {
        return UserProfileDto.ProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .rating(user.getRating())
                .wins(user.getWins())
                .losses(user.getLosses())
                .xp(user.getXp())
                .streak(user.getStreak())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .build();
    }

       /**
     * Search users by username prefix (for friend search autocomplete).
     * Returns up to 10 matches, excluding the searching user.
     */
       public List<UserSearchDto> searchByUsername(String query, String excludeId) {
        if (query == null || query.trim().length() < 2) {
            return List.of(); // require at least 2 chars
        }
        return userRepository
                .searchByUsernamePrefix(query.trim(), excludeId, PageRequest.of(0, 10))
                .stream()
                .map(u -> UserSearchDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .rating(u.getRating())
                        .build())
                .toList();
    }
}
