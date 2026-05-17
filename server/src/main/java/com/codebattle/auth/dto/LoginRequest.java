package com.codebattle.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    //Valid email
    @Email @NotBlank
    private String email;

    @NotBlank
    private String password;
}
