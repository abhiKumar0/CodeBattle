package com.codebattle.match;

import com.codebattle.match.dto.MatchDto;
import com.codebattle.notification.NotificationService;
import com.codebattle.room.RoomService;
import com.codebattle.room.dto.RoomDto;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchmakingServiceTest {

    @Mock StringRedisTemplate redisTemplate;
    @Mock ListOperations<String, String> listOps;
    @Mock ValueOperations<String, String> valueOps;
    @Mock RoomService roomService;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;

    @InjectMocks MatchMakingService matchmakingService;

    private User player1;
    private User player2;

    @BeforeEach
    void setUp() {
        player1 = User.builder().id("p1").username("player1").rating(1200).build();
        player2 = User.builder().id("p2").username("player2").rating(1200).build();

        lenient().when(redisTemplate.opsForList()).thenReturn(listOps);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
        lenient().when(userRepository.findById("p1")).thenReturn(Optional.of(player1));
        lenient().when(userRepository.findById("p2")).thenReturn(Optional.of(player2));
    }

    @Test
    void joinsQueueWhenNoOpponentAvailable() {
        when(redisTemplate.hasKey("match:in-queue:p1")).thenReturn(false);
        when(listOps.leftPop("match:queue")).thenReturn(null);

        MatchDto.MatchResponse res = matchmakingService.joinQueue("p1");

        assertThat(res.getStatus()).isEqualTo(MatchDto.MatchStatus.WAITING);
        verify(listOps).rightPush("match:queue", "p1");
    }

    @Test
    void matchesTwoPlayersWhenOpponentIsWaiting() {
        when(redisTemplate.hasKey("match:in-queue:p1")).thenReturn(false);
        when(listOps.leftPop("match:queue")).thenReturn("p2");

        RoomDto.RoomResponse mockRoom = RoomDto.RoomResponse.builder()
                .id("room-id").code("XYZ123").build();
        when(roomService.createRoom(eq("p2"), any())).thenReturn(mockRoom);
        when(roomService.joinRoom("XYZ123", "p1")).thenReturn(mockRoom);

        MatchDto.MatchResponse res = matchmakingService.joinQueue("p1");

        assertThat(res.getStatus()).isEqualTo(MatchDto.MatchStatus.MATCHED);
        assertThat(res.getRoomCode()).isEqualTo("XYZ123");
    }

    @Test
    void throwsWhenUserAlreadyInQueue() {
        when(redisTemplate.hasKey("match:in-queue:p1")).thenReturn(true);

        assertThatThrownBy(() -> matchmakingService.joinQueue("p1"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void cancelQueueRemovesUserFromQueue() {
        when(redisTemplate.hasKey("match:in-queue:p1")).thenReturn(true);

        matchmakingService.cancelQueue("p1");

        verify(listOps).remove("match:queue", 0, "p1");
        verify(redisTemplate).delete("match:in-queue:p1");
    }
}