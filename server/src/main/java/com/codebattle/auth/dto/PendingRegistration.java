package com.codebattle.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PendingRegistration {
    private String username;
    private String email;
    private String hashedPassword;
}
