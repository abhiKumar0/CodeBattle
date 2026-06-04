package com.codebattle.user;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BattleHistoryDto {
    private String roomId;
    private String roomCode;
    private String opponentUsername;
    private String opponentProfilePictureUrl;
    private String problemTitle;
    private String problemDifficulty;
    private String result;          // "WIN", "LOSS", "DRAW"
    private int durationMinutes;
    private LocalDateTime endedAt;
}
