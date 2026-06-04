package com.codebattle.submission;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JDoodleClient {

    private final RestTemplate restTemplate;

    @Value("${jdoodle.client-id}")
    private String clientId;

    @Value("${jdoodle.client-secret}")
    private String clientSecret;

    private static final String JDOODLE_URL =
            "https://api.jdoodle.com/v1/execute";

    public JDoodleResult execute(String code, String language, String input) throws Exception {

        Map<String, Object> body = new HashMap<>();
        body.put("clientId", clientId);
        body.put("clientSecret", clientSecret);
        body.put("script", code);
        body.put("language", getLanguage(language));
        body.put("versionIndex", getVersionIndex(language));
        body.put("stdin", input);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(body);

        HttpEntity<String> request = new HttpEntity<>(json, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                JDOODLE_URL,
                request,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();

        return JDoodleResult.builder()
                .output((String) responseBody.get("output"))
                .statusCode((Integer) responseBody.get("statusCode"))
                .memory(parseMemory(responseBody.get("memory")))
                .cpuTime(parseCpuTime(responseBody.get("cpuTime")))
                .build();
    }

    private String getLanguage(String language) {
        return switch (language.toLowerCase()) {
            case "java" -> "java";
            case "python" -> "python3";
            case "cpp" -> "cpp17";
            case "javascript" -> "nodejs";
            default -> throw new IllegalArgumentException("Unsupported language");
        };
    }

    private String getVersionIndex(String language) {
        return switch (language.toLowerCase()) {
            case "java" -> "4";
            case "python" -> "4";
            case "cpp" -> "1";
            case "javascript" -> "4";
            default -> throw new IllegalArgumentException("Unsupported language");
        };
    }

    private Integer parseMemory(Object memoryObj) {
        if (memoryObj == null) return null;
        try {
            return Integer.parseInt(memoryObj.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private Double parseCpuTime(Object cpuTimeObj) {
        if (cpuTimeObj == null) return null;
        try {
            return Double.parseDouble(cpuTimeObj.toString());
        } catch (Exception e) {
            return null;
        }
    }

    @Data
    @Builder
    public static class JDoodleResult {
        private String output;
        private Integer statusCode;
        private Integer memory;
        private Double cpuTime;

        public boolean isSuccess() {
            return statusCode != null && statusCode == 200;
        }

        public boolean isCompileError() {
            return output != null &&
                    (output.contains("error:") || output.contains("Main.java"));
        }

        public boolean isRuntimeError() {
            return !isSuccess() && !isCompileError();
        }
    }
}