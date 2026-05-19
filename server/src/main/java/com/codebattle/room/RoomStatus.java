package com.codebattle.room;

public enum RoomStatus {
    CREATED,   // creator made the room, no opponent yet
    WAITING,   // opponent joined, waiting for both to ready up
    ACTIVE,    // both ready, match in progress
    FINISHED,  // someone won or timer ended
    EXPIRED    // nobody joined in 10 min (scheduler handles this)
}