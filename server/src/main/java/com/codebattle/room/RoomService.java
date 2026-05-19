package com.codebattle.room;


import com.codebattle.problem.Problem;
import com.codebattle.problem.ProblemRepository;
import com.codebattle.room.dto.RoomDto;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {
    private final RoomRepository roomRepository;
    private  final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SimpMessagingTemplate messageTemplate;

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

        if (isCreator && isOpponent) {
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

        User winner = findUserOrThrow(winnerId);
        room.setStatus(RoomStatus.FINISHED);
        room.setWinner(winner);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);


        broadcast(roomId, "MATCH_ENDED", Map.of("winnerId", winnerId, "winnerUsername", winner.getUsername()));
    }


    // ------ Scheduler: Expire abandoned rooms

    @Transactional
    public void expireAbandonedRoom() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<Room> expired = roomRepository.findExpiredRoom(threshold);

        expired.forEach(r -> {
            r.setStatus(RoomStatus.EXPIRED);
            r.setEndedAt(LocalDateTime.now());
            log.info("Expired room: {}", r.getCode());
        });

        if (!expired.isEmpty()) {
            roomRepository.saveAll(expired);
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
                "/topic/room"+roomId,
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
    Room findByIdOrThrow(String id) {
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
                .createrReady(r.isCreatorReady())
                .opponentReady(r.isOpponentReady())
                .createdAt(r.getCreatedAt())
                .startedAt(r.getStartedAt())
                .endedAt(r.getEndedAt())
                .winnerId(r.getWinner() != null ? r.getWinner().getId() : null)
                .build();
    }

}
