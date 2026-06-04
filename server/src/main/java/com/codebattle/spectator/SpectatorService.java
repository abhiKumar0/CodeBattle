package com.codebattle.spectator;

import com.codebattle.room.Room;
import com.codebattle.room.RoomRepository;
import com.codebattle.room.RoomStatus;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpectatorService {

    private final RoomRepository        roomRepository;
    private final UserRepository        userRepository;
    private final SimpMessagingTemplate ws;

    /**
     * roomId → LinkedHashMap<username, SpectatorInfo>
     * LinkedHashMap preserves insertion order so new joiners see the list in order.
     */
    private final Map<String, Map<String, SpectatorInfo>> spectatorsByRoom =
            new ConcurrentHashMap<>();

    record SpectatorInfo(String username, String initial) {}

    // ── JOIN ──────────────────────────────────────────────────────────────────

    public SpectatorDto.JoinResponse join(String roomCode, String userId) {
        Room room = findByCodeOrThrow(roomCode);
        User user = findUserOrThrow(userId);

        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Can only spectate active rooms (status: " + room.getStatus() + ")");
        }

        // Real-time expiry check: the room might still be ACTIVE in DB
        // but actually past its deadline (timer hasn't fired yet)
        if (room.getStartedAt() != null && room.getDuration() > 0) {
            java.time.LocalDateTime expiry = room.getStartedAt().plusMinutes(room.getDuration());
            if (java.time.LocalDateTime.now().isAfter(expiry)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This match has already ended (time expired)");
            }
        }

        boolean isPlayer = room.getCreator().getId().equals(userId)
                || (room.getOpponent() != null
                    && room.getOpponent().getId().equals(userId));
        if (isPlayer) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Players cannot spectate their own match");
        }

        // Add spectator to room map
        spectatorsByRoom
                .computeIfAbsent(room.getId(), k -> new LinkedHashMap<>())
                .put(user.getUsername(), new SpectatorInfo(
                        user.getUsername(),
                        String.valueOf(user.getUsername().charAt(0)).toUpperCase()
                ));

        List<SpectatorDto.SpectatorEntry> allSpectators = getAllSpectators(room.getId());
        int count = allSpectators.size();

        // Broadcast to ALL existing spectators + players in the room
        // so their count + list updates immediately
        ws.convertAndSend("/topic/room/" + room.getId(),
                Map.of("type", "SPECTATOR_JOINED",
                       "payload", Map.of(
                               "username",   user.getUsername(),
                               "initial",    String.valueOf(user.getUsername().charAt(0)).toUpperCase(),
                               "count",      count,
                               "spectators", allSpectators  // full list every time
                       )));

        log.info("Spectator {} joined room {}, total={}", user.getUsername(), roomCode, count);

        return SpectatorDto.JoinResponse.builder()
                .roomId(room.getId())
                .roomCode(room.getCode())
                .spectatorCount(count)
                .spectators(allSpectators)   // full list for the joiner
                .creator(playerSnap(room.getCreator()))
                .opponent(room.getOpponent() != null ? playerSnap(room.getOpponent()) : null)
                .problem(room.getProblem() != null ? problemSnap(room) : null)
                .startedAt(room.getStartedAt() != null ? room.getStartedAt().toString() : null)
                .duration(room.getDuration())
                .build();
    }

    // ── LEAVE ─────────────────────────────────────────────────────────────────

    public void leave(String roomId, String username) {
        Map<String, SpectatorInfo> spectators = spectatorsByRoom.get(roomId);
        if (spectators != null) {
            spectators.remove(username);
            List<SpectatorDto.SpectatorEntry> remaining = getAllSpectators(roomId);
            int count = remaining.size();

            ws.convertAndSend("/topic/room/" + roomId,
                    Map.of("type", "SPECTATOR_LEFT",
                           "payload", Map.of(
                                   "username",   username,
                                   "count",      count,
                                   "spectators", remaining
                           )));

            log.info("Spectator {} left room {}, remaining={}", username, roomId, count);
        }
    }

    // ── GET ACTIVE ROOMS ──────────────────────────────────────────────────────

    public List<SpectatorDto.ActiveRoomSummary> getActiveRooms() {
        return roomRepository.findAll().stream()
                .filter(r -> r.getStatus() == RoomStatus.ACTIVE)
                .map(r -> SpectatorDto.ActiveRoomSummary.builder()
                        .roomId(r.getId())
                        .roomCode(r.getCode())
                        .creatorUsername(r.getCreator().getUsername())
                        .creatorRating(r.getCreator().getRating())
                        .opponentUsername(r.getOpponent() != null
                                ? r.getOpponent().getUsername() : "?")
                        .opponentRating(r.getOpponent() != null
                                ? r.getOpponent().getRating() : 0)
                        .problemTitle(r.getProblem() != null
                                ? r.getProblem().getTitle() : "Unknown")
                        .difficulty(r.getProblem() != null
                                ? r.getProblem().getDifficulty().name() : "?")
                        .startedAt(r.getStartedAt() != null
                                ? r.getStartedAt().toString() : null)
                        .duration(r.getDuration())
                        .spectatorCount(getSpectatorCount(r.getId()))
                        .build())
                .toList();
    }

    public int getSpectatorCount(String roomId) {
        return spectatorsByRoom.getOrDefault(roomId, Collections.emptyMap()).size();
    }

    public void clearRoom(String roomId) {
        spectatorsByRoom.remove(roomId);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private List<SpectatorDto.SpectatorEntry> getAllSpectators(String roomId) {
        return spectatorsByRoom
                .getOrDefault(roomId, Collections.emptyMap())
                .values().stream()
                .map(s -> SpectatorDto.SpectatorEntry.builder()
                        .username(s.username())
                        .initial(s.initial())
                        .build())
                .toList();
    }

    private Room findByCodeOrThrow(String code) {
        return roomRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Room not found: " + code));
    }

    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    private SpectatorDto.PlayerSnapshot playerSnap(User u) {
        return SpectatorDto.PlayerSnapshot.builder()
                .id(u.getId()).username(u.getUsername()).rating(u.getRating()).build();
    }

    private SpectatorDto.ProblemSnapshot problemSnap(Room r) {
        return SpectatorDto.ProblemSnapshot.builder()
                .id(r.getProblem().getId())
                .title(r.getProblem().getTitle())
                .difficulty(r.getProblem().getDifficulty().name())
                .timeLimit(r.getProblem().getTimeLimit())
                .memoryLimit(r.getProblem().getMemoryLimit())
                .build();
    }
}
