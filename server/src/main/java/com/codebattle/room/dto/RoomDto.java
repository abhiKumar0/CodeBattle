package com.codebattle.room.dto;

import com.codebattle.room.RoomStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class RoomDto {

//    ---- Request ----

    @Data
    @Builder
    public static class createRequest {

        /** Optional: pin a specific problem. If null, a random one is assigned on ACTIVE. */
        private String problemId;

        /** Match duration in minutes; defaults to 30 if omitted. */
        private Integer duration;
    }


//    ------- Response ---------

    @Data
    @Builder
    public static class RoomResponse {
        private String id;
        private String code;
        private RoomStatus status;
        private PlayerInfo creator;
        private PlayerInfo opponent; //null until some joins
        private ProblemInfo problem; //null untill active
        private int duration;
        private boolean createrReady;
        private boolean opponentReady;
        private LocalDateTime createdAt;
        private LocalDateTime startedAt;
        private LocalDateTime endedAt;
        private String winnerId;
    }





    @Data
    @Builder
    public static class PlayerInfo {
        private String id;
        private String username;
        private int rating;
        private boolean ready;
    }

    @Data
    @Builder
    public static class ProblemInfo {
        private String id;
        private String title;
        private String difficulty;
        private int timeLimit;
        private int memoryLimit;
    }


//    ----- WebSocket event Payload ------

    @Data
    @Builder
    public static class RoomEvent {
        private String type;  // OPPONENT_JOINED | PLAYER_READY | MATCH_STARTED | MATCH_ENDED

        private Object payload; // flexible — attach whatever the frontend needs
    }






}
