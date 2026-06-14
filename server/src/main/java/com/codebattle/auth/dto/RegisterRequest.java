package com.codebattle.auth.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterRequest {

    @NotBlank @Size(min = 2, max = 50)
    private String username;

    @Email @NotBlank
    private String email;

    @NotBlank @Size(min = 6)
    private String password;
}
