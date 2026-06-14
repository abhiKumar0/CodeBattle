package com.codebattle.friend;

import com.codebattle.achievement.AchievementService;
import com.codebattle.notification.NotificationService;
import com.codebattle.user.User;
import com.codebattle.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendServiceTest {

    @Mock FriendRepository friendRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock AchievementService achievementService;

    @InjectMocks FriendService friendService;

    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        userA = User.builder().id("a").username("alice").rating(1200).build();
        userB = User.builder().id("b").username("bob").rating(1300).build();

        lenient().when(userRepository.findById("a")).thenReturn(Optional.of(userA));
        lenient().when(userRepository.findById("b")).thenReturn(Optional.of(userB));
        lenient().when(friendRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void sendFriendRequestSuccessfully() {
        when(friendRepository.findBetween("a", "b")).thenReturn(Optional.empty());

        FriendDto.FriendResponse res = friendService.sendRequest("a", "b");

        assertThat(res.getStatus()).isEqualTo(FriendStatus.PENDING);
        verify(notificationService).notifyFriendRequest(eq("b"), eq("alice"));
    }

    @Test
    void cannotSendRequestToYourself() {
        assertThatThrownBy(() -> friendService.sendRequest("a", "a"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void cannotSendDuplicateRequest() {
        Friend existing = Friend.builder()
                .user(userA).friend(userB).status(FriendStatus.PENDING).build();
        when(friendRepository.findBetween("a", "b")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> friendService.sendRequest("a", "b"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void acceptRequestChangesStatusToAccepted() {
        Friend pending = Friend.builder()
                .id("f1").user(userA).friend(userB).status(FriendStatus.PENDING).build();
        when(friendRepository.findBetween("a", "b")).thenReturn(Optional.of(pending));

        FriendDto.FriendResponse res = friendService.acceptRequest("b", "a");

        assertThat(res.getStatus()).isEqualTo(FriendStatus.ACCEPTED);
    }

    @Test
    void senderCannotAcceptTheirOwnRequest() {
        Friend pending = Friend.builder()
                .user(userA).friend(userB).status(FriendStatus.PENDING).build();
        when(friendRepository.findBetween("b", "a")).thenReturn(Optional.of(pending));

        // userA sent the request, userA tries to accept — should fail
        assertThatThrownBy(() -> friendService.acceptRequest("a", "b"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void removeFriendDeletesRelationship() {
        Friend accepted = Friend.builder()
                .user(userA).friend(userB).status(FriendStatus.ACCEPTED).build();
        when(friendRepository.findBetween("a", "b")).thenReturn(Optional.of(accepted));

        friendService.removeFriend("a", "b");

        verify(friendRepository).delete(accepted);
    }
}