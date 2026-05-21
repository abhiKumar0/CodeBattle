package com.codebattle.match;

import com.codebattle.notification.NotificationService;
import com.codebattle.room.Room;
import com.codebattle.room.RoomRepository;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class EloService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;

    // control the rating change spped  
    private static final int K_FACTOR      = 32;  // standard K for new/mid players
    private static final int MIN_RATING    = 100;  // floor so nobody goes negative

    // ─── Called by RoomService.finishRoom() after a winner is determined ──────

    @Transactional
    // called after match is end  
    public EloResult updateRatings(String roomId) {
        // fetch the room 
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Room not found"));

        if (room.getWinner() == null || room.getOpponent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Room has no winner or opponent set");
        }

         // find the winner and looser from the room 
        User winner = room.getWinner();
        User loser  = room.getCreator().getId().equals(winner.getId())
                ? room.getOpponent()
                : room.getCreator();

        int winnerOldRating = winner.getRating();
        int loserOldRating  = loser.getRating();

        // Expected scores (probability of winning)
        double expectedWinner = expectedScore(winnerOldRating, loserOldRating);
        double expectedLoser  = expectedScore(loserOldRating,  winnerOldRating);

        // New ratings
        int winnerNewRating = newRating(winnerOldRating, 1.0, expectedWinner);
        int loserNewRating  = newRating(loserOldRating,  0.0, expectedLoser);

        int winnerDelta = winnerNewRating - winnerOldRating;
        int loserDelta  = loserNewRating  - loserOldRating;

        //update the ratings  
        winner.setRating(winnerNewRating);
        winner.setWins(winner.getWins() + 1);

        loser.setRating(loserNewRating);
        loser.setLosses(loser.getLosses() + 1);

        userRepository.save(winner);
        userRepository.save(loser);

// logs the rating  
        log.info("ELO updated — winner: {} {} → {} (+{}), loser: {} {} → {} ({})",
                winner.getUsername(), winnerOldRating, winnerNewRating, winnerDelta,
                loser.getUsername(),  loserOldRating,  loserNewRating,  loserDelta);

        // Notify both players of result + rating change
        notificationService.notifyMatchResult(
                winner.getUsername(), true,  winnerDelta, winnerNewRating);
        notificationService.notifyMatchResult(
                loser.getUsername(),  false, loserDelta,  loserNewRating);

        return EloResult.builder()
                .winnerId(winner.getId())
                .loserId(loser.getId())
                .winnerOldRating(winnerOldRating)
                .winnerNewRating(winnerNewRating)
                .winnerDelta(winnerDelta)
                .loserOldRating(loserOldRating)
                .loserNewRating(loserNewRating)
                .loserDelta(loserDelta)
                .build();
    }

    // ─── ELO formula ──────────────────────────────────────────────────────────

    /**
     * Expected score for player A against player B.
     * Returns a value between 0 and 1 (probability of winning).
     */
    private double expectedScore(int ratingA, int ratingB) {
        return 1.0 / (1.0 + Math.pow(10, (ratingB - ratingA) / 400.0));
    }

    /**
     * New rating after a game.
     * actualScore = 1.0 for win, 0.0 for loss, 0.5 for draw (no draws here).
     */
    private int newRating(int oldRating, double actualScore, double expectedScore) {
        int updated = (int) Math.round(oldRating + K_FACTOR * (actualScore - expectedScore));
        return Math.max(updated, MIN_RATING);
    }

    // ─── Result DTO 
    @lombok.Data
    @lombok.Builder
    public static class EloResult {
        private String winnerId;
        private String loserId;
        private int winnerOldRating;
        private int winnerNewRating;
        private int winnerDelta;
        private int loserOldRating;
        private int loserNewRating;
        private int loserDelta;
    }
}
