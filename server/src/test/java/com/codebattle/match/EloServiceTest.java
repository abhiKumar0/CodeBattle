package com.codebattle.match;

import com.codebattle.leaderboard.LeaderboardService;
import com.codebattle.notification.NotificationService;
import com.codebattle.notification.EmailService;
import com.codebattle.achievement.AchievementService;
import com.codebattle.achievement.XpService;
import com.codebattle.problem.Difficulty;
import com.codebattle.problem.Problem;
import com.codebattle.room.Room;
import com.codebattle.room.RoomRepository;
import com.codebattle.room.RoomStatus;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EloServiceTest {

    @Mock RoomRepository roomRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock LeaderboardService leaderboardService;
    @Mock XpService xpService;
    @Mock AchievementService achievementService;
    @Mock EmailService emailService;

    @InjectMocks EloService eloService;

    private User winner;
    private User loser;
    private Room room;
    private Problem problem;

    @BeforeEach
    void setUp() {
        winner = User.builder()
                .id("winner-id")
                .username("winner")
                .email("winner@test.com")
                .rating(1200)
                .wins(0)
                .losses(0)
                .build();

        loser = User.builder()
                .id("loser-id")
                .username("loser")
                .email("loser@test.com")
                .rating(1200)
                .wins(0)
                .losses(0)
                .build();

        problem = Problem.builder()
                .id("problem-id")
                .title("Two Sum")
                .difficulty(Difficulty.EASY)
                .build();

        room = Room.builder()
                .id("room-id")
                .creator(winner)
                .opponent(loser)
                .winner(winner)
                .status(RoomStatus.FINISHED)
                .problem(problem)
                .build();

        lenient().when(roomRepository.findById("room-id")).thenReturn(Optional.of(room));
    }

    @Test
    void winnerRatingIncreasesAfterMatch() {
        EloService.EloResult result = eloService.updateRatings("room-id");
        assertThat(result.getWinnerNewRating()).isGreaterThan(1200);
    }

    @Test
    void loserRatingDecreasesAfterMatch() {
        EloService.EloResult result = eloService.updateRatings("room-id");
        assertThat(result.getLoserNewRating()).isLessThan(1200);
    }

    @Test
    void ratingDeltasAreSymmetricAtEqualRatings() {
        EloService.EloResult result = eloService.updateRatings("room-id");
        // at equal ratings, winner gains exactly what loser loses
        assertThat(result.getWinnerDelta()).isEqualTo(-result.getLoserDelta());
    }

    @Test
    void upsetGivesHigherRewardToWinner() {
        // underdog (1000) beats favorite (1400) — should gain more than 16
        winner.setRating(1000);
        loser.setRating(1400);

        EloService.EloResult result = eloService.updateRatings("room-id");

        assertThat(result.getWinnerDelta()).isGreaterThan(16);
        assertThat(result.getLoserDelta()).isLessThan(-16);
    }

    @Test
    void favoriteWinningGivesLowerReward() {
        // favorite (1400) beats underdog (1000) — gains less than 16
        winner.setRating(1400);
        loser.setRating(1000);

        EloService.EloResult result = eloService.updateRatings("room-id");

        assertThat(result.getWinnerDelta()).isLessThan(16);
    }

    @Test
    void ratingNeverDropsBelowMinimum() {
        loser.setRating(100); // already at floor
        winner.setRating(2000);

        EloService.EloResult result = eloService.updateRatings("room-id");

        assertThat(result.getLoserNewRating()).isGreaterThanOrEqualTo(100);
    }

    @Test
    void winsAndLossesAreUpdated() {
        eloService.updateRatings("room-id");

        verify(userRepository, times(2)).save(any(User.class));
        assertThat(winner.getWins()).isEqualTo(1);
        assertThat(loser.getLosses()).isEqualTo(1);
    }

    @Test
    void throwsWhenRoomNotFound() {
        when(roomRepository.findById("bad-id")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> eloService.updateRatings("bad-id"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void throwsWhenRoomHasNoWinner() {
        room.setWinner(null);
        assertThatThrownBy(() -> eloService.updateRatings("room-id"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void notifiesBothPlayersAfterMatch() {
        eloService.updateRatings("room-id");
        verify(notificationService).notifyMatchResult(eq("winner"), eq(true), anyInt(), anyInt());
        verify(notificationService).notifyMatchResult(eq("loser"), eq(false), anyInt(), anyInt());
    }
}