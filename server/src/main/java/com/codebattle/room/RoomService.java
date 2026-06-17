package com.codebattle.room;


import com.codebattle.match.EloService;
import com.codebattle.problem.Problem;
import com.codebattle.problem.ProblemRepository;
import com.codebattle.room.dto.RoomDto;
import com.codebattle.spectator.SpectatorService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {
    private final RoomRepository roomRepository;
    private  final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SimpMessagingTemplate messageTemplate;
    private final EloService eloService;
    private final SpectatorService spectatorService;
    private final RoomExpiryTaskManager roomExpiryTaskManager;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


//    ----- Create room ----

    @Transactional
    public RoomDto.RoomResponse createRoom(String creatorId, RoomDto.createRequest req) {

        User creator = findUserOrThrow(creatorId);

        // Prevent a user from having two active rooms simultaneously
        roomRepository.findActiveRoomForUser(creatorId).ifPresent(room -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have an active room" + room.getCode());
        });

        Problem problem = null;

        if (req.getProblemId() != null) {
            problem = problemRepository.findById(req.getProblemId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Problem with id " + req.getProblemId()));
        }

        int duration = (req.getDuration() != null && req.getDuration() > 0)
                ? req.getDuration() : 30;

        Room room = Room.builder()
                .code(generateUniqueCode())
                .creator(creator)
                .problem(problem)
                .duration(duration)
                .status(RoomStatus.CREATED)
                .build();

        return toResponse(roomRepository.save(room));
    }


//    ----- Close ROom --------

    @Transactional
    public void closeRoom(String roomId, String userId) {
        Room room = findByIdOrThrow(roomId);

        if (!room.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the room creator can close it");
        }
        if (room.getStatus() == RoomStatus.FINISHED || room.getStatus() == RoomStatus.EXPIRED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Room is already closed");
        }

        room.setStatus(RoomStatus.EXPIRED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);

        // Notify anyone who might be in the lobby
        broadcast(roomId, "ROOM_CLOSED", Map.of("reason", "Host closed the room"));
    }



//    ----- Join ROom --------

    @Transactional
    public RoomDto.RoomResponse joinRoom(String code, String userId) {
        Room room = findByCodeOrThrow(code);
        User user = findUserOrThrow(userId);

        //Cant join your own room
        if (room.getCreator().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot join your own room");
        }

        //Room must be in created state
        if (room.getStatus() != RoomStatus.CREATED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room is not open for joining (status: " + room.getStatus() + ")");
        }

        room.setOpponent(user);
        room.setStatus(RoomStatus.WAITING);
        Room saved = roomRepository.save(room);

        //Notify Created via WebsSocket
        broadcast(room.getId(), "OPPONENT_JOINED",
                RoomDto.PlayerInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .rating(user.getRating())
                        .ready(false)
                .build());
        return toResponse(saved);
    }


    // ---------- Ready Up ----------------

    @Transactional
    public RoomDto.RoomResponse setReady(String roomId, String userId) {
        Room room = findByIdOrThrow(roomId);

        if (room.getStatus() != RoomStatus.WAITING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room is not in WAITING state");
        }

        boolean isCreator = room.getCreator().getId().equals(userId);
        boolean isOpponent = room.getOpponent() != null
                && room.getOpponent().getId().equals(userId);

        if (!isCreator && !isOpponent) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not a participant of this room");
        }

        if (isCreator) room.setCreatorReady(true);
        if (isOpponent) room.setOpponentReady(true);

        // Broadcast individual ready event
        broadcast(roomId, "PLAYER_READY",
                RoomDto.PlayerInfo.builder()
                        .id(userId)
                        .username(isCreator
                                ? room.getCreator().getUsername()
                                : room.getOpponent().getUsername())
                        .rating(isCreator
                                ? room.getCreator().getRating()
                                : room.getOpponent().getRating())
                        .ready(true)
                        .build());

        if (room.isCreatorReady() && room.isOpponentReady()) {
            activateRoom(room);
        }

        return toResponse(roomRepository.save(room));
    }


    // ---- Get My Active Rooms -------

    public Optional<RoomDto.RoomResponse> getMyActiveRoom(String userId) {
        return roomRepository.findAnyOpenRoomForUser(userId).map(this::toResponse);
    }


        // ---- Getters -------

    public RoomDto.RoomResponse getRoomById(String id) {
        return toResponse(findByIdOrThrow(id));
    }

    public RoomDto.RoomResponse getRoomByCode(String code) {
        return toResponse(findByCodeOrThrow(code));
    }


    // -------- Finish (Called by Submission service) -------

    @Transactional
    public void finishRoom(String roomId, String winnerId) {
        Room room = findByIdOrThrow(roomId);

        // Not started yet or already finished
        if (room.getStatus() != RoomStatus.ACTIVE) return;

        // Cancel the expiry timer — match finished early
        roomExpiryTaskManager.cancelExpiry(roomId);

        User winner = findUserOrThrow(winnerId);
        room.setStatus(RoomStatus.FINISHED);
        room.setWinner(winner);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);


        broadcast(roomId, "MATCH_ENDED", Map.of("winnerId", winnerId, "winnerUsername", winner.getUsername()));

        spectatorService.clearRoom(roomId);

        // Update ELO ratings for both players
    eloService.updateRatings(roomId);
    }


    // ------ Scheduler: Expire abandoned rooms

    @Transactional
    public void expireAbandonedRoom() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<Room> expired = roomRepository.findExpiredRoom(threshold);

        expired.forEach(r -> {
            r.setStatus(RoomStatus.EXPIRED);
            r.setEndedAt(LocalDateTime.now());
            spectatorService.clearRoom(r.getId());
            log.info("Expired abandoned room: {}", r.getCode());
        });

        if (!expired.isEmpty()) {
            roomRepository.saveAll(expired);
        }
    }


    // ── Expire a single room (called by RoomExpiryTaskManager timer) ────────

    @Transactional
    public void expireSingleRoom(String roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null || room.getStatus() != RoomStatus.ACTIVE) {
            return; // already finished or doesn't exist
        }

        room.setStatus(RoomStatus.EXPIRED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);

        broadcast(roomId, "MATCH_ENDED",
                Map.of("winnerId", "",
                       "winnerUsername", "",
                       "reason", "TIME_UP"));

        spectatorService.clearRoom(roomId);
        log.info("Expired timed-out room: {} (code: {})", roomId, room.getCode());
    }


    // ── Fallback: expire any active rooms past their deadline (crash recovery) ──

    @Transactional
    public void expireTimedOutRooms() {
        List<Room> expired = roomRepository.findExpiredActiveRooms(LocalDateTime.now());
        for (Room room : expired) {
            room.setStatus(RoomStatus.EXPIRED);
            room.setEndedAt(LocalDateTime.now());
            roomRepository.save(room);

            broadcast(room.getId(), "MATCH_ENDED",
                    Map.of("winnerId", "",
                           "winnerUsername", "",
                           "reason", "TIME_UP"));

            spectatorService.clearRoom(room.getId());
            log.info("Fallback expired room: {} (code: {})", room.getId(), room.getCode());
        }
    }

//    ------- Helper functions --------------

    private void activateRoom(Room room) {
        //Assign a random problem if none was pinned
        if (room.getProblem() == null) {
            List<Problem> all = problemRepository.findAll();
            if (all.isEmpty()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No problems available");

            room.setProblem(all.get(RANDOM.nextInt(all.size())));
        }

        room.setStatus(RoomStatus.ACTIVE);
        room.setStartedAt(LocalDateTime.now());

        // Schedule expiry timer for this room
        if (room.getDuration() > 0) {
            Instant expiresAt = room.getStartedAt()
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .plus(Duration.ofMinutes(room.getDuration()));
            roomExpiryTaskManager.scheduleExpiry(room.getId(), expiresAt);
        }

        broadcast(room.getId(), "MATCH_STARTED",
                RoomDto.ProblemInfo.builder()
                        .id(room.getProblem().getId())
                        .title(room.getProblem().getTitle())
                        .difficulty(room.getProblem().getDifficulty().name())
                        .timeLimit(room.getProblem().getTimeLimit())
                        .memoryLimit(room.getProblem().getMemoryLimit())
                        .build());
    }


    // Broadcast Helper functions
    private void broadcast(String roomId, String event, Object payload) {
        messageTemplate.convertAndSend(
                "/topic/room/"+roomId,
                RoomDto.RoomEvent.builder()
                        .type(event)
                        .payload(payload)
                        .build()
        );
    }


    //Generate Unique code
    private String generateUniqueCode() {
        String code;
        do {
            code = randomCode();
        } while (roomRepository.existsByCode(code));
        return code;
    }

    //Random Code
    private String randomCode() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }

        return sb.toString();
    }

    //Find room by id
    public Room findByIdOrThrow(String id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Room not found: " + id));
    }

    // Find room by code
    private Room findByCodeOrThrow(String code) {
        return roomRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Room not found: " + code));
    }

    //Find user by id
    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + id));
    }


    // ------- Mapping --------

    RoomDto.RoomResponse toResponse(Room r) {
        RoomDto.PlayerInfo creatorInfo = RoomDto.PlayerInfo.builder()
                .id(r.getCreator().getId())
                .username(r.getCreator().getUsername())
                .rating(r.getCreator().getRating())
                .ready(r.isCreatorReady())
                .build();

        RoomDto.PlayerInfo opponentInfo = r.getOpponent() == null ? null
                : RoomDto.PlayerInfo.builder()
                .id(r.getOpponent().getId())
                .username(r.getOpponent().getUsername())
                .rating(r.getOpponent().getRating())
                .ready(r.isOpponentReady())
                .build();

        RoomDto.ProblemInfo problemInfo = r.getProblem() == null ? null
                : RoomDto.ProblemInfo.builder()
                .id(r.getProblem().getId())
                .title(r.getProblem().getTitle())
                .difficulty(r.getProblem().getDifficulty().name())
                .timeLimit(r.getProblem().getTimeLimit())
                .memoryLimit(r.getProblem().getMemoryLimit())
                .build();

        return RoomDto.RoomResponse.builder()
                .id(r.getId())
                .code(r.getCode())
                .status(r.getStatus())
                .creator(creatorInfo)
                .opponent(opponentInfo)
                .problem(problemInfo)
                .duration(r.getDuration())
                .creatorReady(r.isCreatorReady())
                .opponentReady(r.isOpponentReady())
                .createdAt(toInstant(r.getCreatedAt()))
                .startedAt(toInstant(r.getStartedAt()))
                .endedAt(toInstant(r.getEndedAt()))
                .winnerId(r.getWinner() != null ? r.getWinner().getId() : null)
                .build();
    }

    /**
     * Converts the server's LocalDateTime (wall-clock time in the JVM's
     * default timezone) into an Instant (absolute UTC point in time).
     *
     * WHY THIS MATTERS:
     * Jackson serializes LocalDateTime as "2026-06-13T10:00:00.123456789"
     * (no timezone, often with nanosecond precision). JavaScript's
     * `new Date(...)` CANNOT reliably parse that — it returns Invalid Date
     * (NaN), which made the battle countdown timer freeze permanently
     * instead of counting down.
     *
     * Instant serializes as "2026-06-13T10:00:00.123Z" which `new Date(...)`
     * parses correctly in every browser/timezone — fixing the timer.
     */
    private Instant toInstant(LocalDateTime ldt) {
        return ldt == null ? null : ldt.atZone(ZoneId.systemDefault()).toInstant();
    }

}