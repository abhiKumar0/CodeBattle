package com.codebattle.challenge;

import com.codebattle.notification.NotificationService;
import com.codebattle.room.RoomService;
import com.codebattle.room.dto.RoomDto;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;


@Service
@RequiredArgsConstructor
@Slf4j
public class ChallengeService {

    private final ChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final RoomService roomService;
    private final NotificationService notificationService;

    private static final int EXPIRY_MINUTES = 5;

    // ─── Send challenge ───────────────────────────────────────────────────────


    @Transactional
    public ChallengeDto.ChallengeResponse sendChallenge(String challengerId, String challengedId) {
        if (challengerId.equals(challengedId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot challenge yourself");
        }

        User challenger = findUserOrThrow(challengerId);
        User challenged = findUserOrThrow(challengedId);

        //Block Duplicate pending challenges
        List<Challenge> existing = challengeRepository.findPendingBetween(challengerId, challengedId);

        if (existing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A pending challenge already exists");
        }

        Challenge challenge = Challenge.builder()
                .challenger(challenger)
                .challenged(challenged)
                .status(ChallengeStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES))
                .build();

        Challenge saved = challengeRepository.save(challenge);

        // Notify challenged user via WebSocket TODO
        notificationService.notifyChallengeReceived(
                challenged.getUsername(),
                challengerId,
                challenger.getUsername(),
                saved.getId()
        );


        return toResponse(saved);
    }



    // ─── Accept ───────────────────────────────────────────────────────────────


    @Transactional
    public ChallengeDto.ChallengeResponse acceptChallenge(String userId, String challengeId) {
        Challenge challenge = findOrThrow(challengeId);

        //Validation
        if (!challenge.getChallenged().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This challenge is not for you");
        }
        if (challenge.getStatus() != ChallengeStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Challenge is no longer pending");
        }

        if (LocalDateTime.now().isAfter(challenge.getExpiresAt())) {
            challenge.setStatus(ChallengeStatus.EXPIRED);
            challengeRepository.save(challenge);
            throw new ResponseStatusException(HttpStatus.GONE, "Challenge has expired");
        }

        //Challenger creates the room, challenged joins
        RoomDto.RoomResponse room = roomService.createRoom(
                challenge.getChallenger().getId(),
                RoomDto.createRequest.builder().duration(30).build()
        );

        roomService.joinRoom(room.getCode(), userId);

        challenge.setStatus(ChallengeStatus.ACCEPTED);
        challenge.setRoom(
                // We need the Room entity — fetch via RoomService helper
                roomService.findByIdOrThrow(room.getId())
        );
        Challenge saved = challengeRepository.save(challenge);

        // Notify challenger the challenge was accepted
        notificationService.notifyMatchFound(
                challenge.getChallenger().getUsername(), room.getId(), room.getCode());
        notificationService.notifyMatchFound(
                challenge.getChallenged().getUsername(), room.getId(), room.getCode());

        return toResponse(saved);

    }


    // ─── Decline ──────────────────────────────────────────────────────────────

    @Transactional
    public void declineChallenge(String userId, String challengeId) {
        Challenge challenge = findOrThrow(challengeId);

        if (!challenge.getChallenged().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This challenge is not for you");
        }
        if (challenge.getStatus() != ChallengeStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Challenge is no longer pending");
        }

        challenge.setStatus(ChallengeStatus.DECLINED);
        challengeRepository.save(challenge);

        // Notify challenger
        notificationService.sendToUser(
                challenge.getChallenger().getUsername(),
                "CHALLENGE_DECLINED",
                java.util.Map.of(
                        "challengeId", challengeId,
                        "declinedBy",  challenge.getChallenged().getUsername()
                )
        );
    }

    // ─── Expiry scheduler ────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireStaleChallenges() {
        List<Challenge> expired = challengeRepository.findExpired(LocalDateTime.now());
        expired.forEach(c -> {
            c.setStatus(ChallengeStatus.EXPIRED);
            // Notify challenger it expired
            notificationService.sendToUser(
                    c.getChallenger().getUsername(),
                    "CHALLENGE_EXPIRED",
                    java.util.Map.of("challengeId", c.getId())
            );
        });
        if (!expired.isEmpty()) {
            challengeRepository.saveAll(expired);
            log.info("Expired {} challenges", expired.size());
        }
    }


    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Challenge findOrThrow(String id) {
        return challengeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Challenge not found: " + id));
    }

    private User findUserOrThrow(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    private ChallengeDto.ChallengeResponse toResponse(Challenge c) {
        return ChallengeDto.ChallengeResponse.builder()
                .id(c.getId())
                .challengerId(c.getChallenger().getId())
                .challengerUsername(c.getChallenger().getUsername())
                .challengedId(c.getChallenged().getId())
                .challengedUsername(c.getChallenged().getUsername())
                .roomId(c.getRoom() != null ? c.getRoom().getId() : null)
                .roomCode(c.getRoom() != null ? c.getRoom().getCode() : null)
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .expiresAt(c.getExpiresAt())
                .build();
    }
}
