package com.codebattle.user;

import com.codebattle.config.CloudinaryService;
import com.codebattle.room.Room;
import com.codebattle.room.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final CloudinaryService cloudinaryService;

    // ─── Profile Read ──────────────────────────────────────────────────────────

    public UserProfileDto.ProfileResponse getProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
        return toProfile(user);
    }

    public UserProfileDto.ProfileResponse getProfileByUsername(String username, String currentUserId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
        UserProfileDto.ProfileResponse profile = toProfile(user);
        if (!user.getId().equals(currentUserId)) {
            profile.setEmail(null);
        }
        return profile;
    }

    public UserProfileDto.ProfileResponse toProfile(User user) {
        return UserProfileDto.ProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .rating(user.getRating())
                .wins(user.getWins())
                .losses(user.getLosses())
                .xp(user.getXp())
                .streak(user.getStreak())
                .role(user.getRole().name())
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .createdAt(user.getCreatedAt())
                .lastUsernameChangeAt(user.getLastUsernameChangeAt())
                .build();
    }

    // ─── Profile Update ────────────────────────────────────────────────────────

    private static final int USERNAME_COOLDOWN_DAYS = 30;

    public UserProfileDto.ProfileResponse updateProfile(String userId, UserProfileDto.UpdateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        // Username change — check cooldown + uniqueness
        if (req.getUsername() != null && !req.getUsername().equals(user.getUsername())) {
            if (user.getLastUsernameChangeAt() != null) {
                long daysSinceLastChange = ChronoUnit.DAYS.between(
                        user.getLastUsernameChangeAt(), LocalDateTime.now());
                if (daysSinceLastChange < USERNAME_COOLDOWN_DAYS) {
                    long daysLeft = USERNAME_COOLDOWN_DAYS - daysSinceLastChange;
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                            "Username can only be changed once every 30 days. " + daysLeft + " day(s) remaining.");
                }
            }
            if (userRepository.existsByUsername(req.getUsername())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
            }
            user.setUsername(req.getUsername());
            user.setLastUsernameChangeAt(LocalDateTime.now());
        }

        // Display name — freely editable
        if (req.getDisplayName() != null) {
            user.setDisplayName(req.getDisplayName().isBlank() ? null : req.getDisplayName().trim());
        }

        // Bio — nullable (can clear)
        if (req.getBio() != null) {
            user.setBio(req.getBio().isBlank() ? null : req.getBio().trim());
        }

        userRepository.save(user);
        return toProfile(user);
    }

    // ─── Avatar Upload ─────────────────────────────────────────────────────────

    public UserProfileDto.ProfileResponse updateAvatar(String userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        String url = cloudinaryService.uploadAvatar(file, userId);
        user.setProfilePictureUrl(url);
        userRepository.save(user);
        return toProfile(user);
    }

    // ─── Battle History ────────────────────────────────────────────────────────

    public Map<String, Object> getBattleHistory(String userId, int page, int size) {
        // Clamp page size for scalability (prevent huge queries)
        int clampedSize = Math.min(size, 20);

        Page<Room> roomPage = roomRepository.findFinishedRoomsByUserId(
                userId, PageRequest.of(page, clampedSize));

        List<BattleHistoryDto> entries = roomPage.getContent().stream()
                .map(room -> toBattleHistory(room, userId))
                .toList();

        Map<String, Object> result = new HashMap<>();
        result.put("content", entries);
        result.put("page", roomPage.getNumber());
        result.put("totalPages", roomPage.getTotalPages());
        result.put("totalElements", roomPage.getTotalElements());
        result.put("hasNext", roomPage.hasNext());
        return result;
    }

    private BattleHistoryDto toBattleHistory(Room room, String userId) {
        boolean isCreator = room.getCreator().getId().equals(userId);
        User opponent = isCreator ? room.getOpponent() : room.getCreator();

        String result;
        if (room.getWinner() == null) {
            result = "DRAW";
        } else if (room.getWinner().getId().equals(userId)) {
            result = "WIN";
        } else {
            result = "LOSS";
        }

        return BattleHistoryDto.builder()
                .roomId(room.getId())
                .roomCode(room.getCode())
                .opponentUsername(opponent != null ? opponent.getUsername() : "Unknown")
                .opponentProfilePictureUrl(opponent != null ? opponent.getProfilePictureUrl() : null)
                .problemTitle(room.getProblem() != null ? room.getProblem().getTitle() : "Unknown")
                .problemDifficulty(room.getProblem() != null ? room.getProblem().getDifficulty().name() : "EASY")
                .result(result)
                .durationMinutes(room.getDuration())
                .endedAt(room.getEndedAt())
                .build();
    }

    // ─── Search ────────────────────────────────────────────────────────────────

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
