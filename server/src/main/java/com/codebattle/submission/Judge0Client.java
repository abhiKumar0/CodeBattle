package com.codebattle.submission;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Thin wrapper around the Judge0 CE API (RapidAPI).
 *
 * Judge0 language IDs (common):
 * 62 = Java
 * 71 = Python 3
 * 54 = C++ (GCC 9.2)
 * 63 = JavaScript (Node.js)
 * 51 = C# (Mono)
 */
@Component
@RequiredArgsConstructor
@Slf4j // loggers
public class Judge0Client {

    @Value("${judge0.url}")
    private String judge0Url; // read the api from file

    @Value("${judge0.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate; // used to make http req

    private static final Map<String, Integer> LANGUAGE_IDS = Map.of(
            "java", 62,
            "python", 71,
            "cpp", 54,
            "javascript", 63,
            "c", 50);

    /**
     * Submits code + one test case to Judge0 and returns a token.
     * Uses base64 encoding (Judge0 default).
     * @throws JsonProcessingException 
     */
    public String submit(String code, String language, String input,
            int timeLimitMs, int memoryLimitMb) throws JsonProcessingException {
//        log.info("Api Key {}", apiKey);
//        log.info("Submitting code {}", code);
        // find the id from the map of thelanguage use in code
        int languageId = LANGUAGE_IDS.getOrDefault(language.toLowerCase(), 62);

        // create json object
        Map<String, Object> body = new HashMap<>();
    //    body.put("source_code", Base64.getEncoder().encodeToString(code.getBytes())); // 64 encodeing is require in
                                                                                      // judge0
        body.put("source_code", code);
        body.put("language_id", languageId);
    //    body.put("stdin", Base64.getEncoder().encodeToString(input.getBytes())); // encode the user input
        body.put("stdin", input);
        body.put("cpu_time_limit", timeLimitMs / 1000.0); // Judge0 uses seconds
        body.put("memory_limit", memoryLimitMb * 1024); // Judge0 uses KB

        HttpHeaders headers = buildHeaders();
        /*
         * this create
         * Content-Type: application/json
         * X-RapidAPI-Key: xxxx
         * X-RapidAPI-Host: judge0-ce.p.rapidapi.com
         */
        log.info("Request body: {}", body);
        log.info("Final URL: {}", judge0Url + "/submissions?base64_encoded=true&wait=false");
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(body);

        HttpEntity<String> request = new HttpEntity<>(json, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                judge0Url + "/submissions?wait=true",
                request,
                Map.class);// send post request
        /*
         * 
         * (wait=false):
         * Without this:
         * Judge0 waits until code executes.
         * With this:
         * Judge0 instantly returns token.
         * This is asynchronous execution.
         */

        if (response.getBody() == null || !response.getBody().containsKey("token")) {
            throw new RuntimeException("Judge0 did not return a token");
        }

        return (String) response.getBody().get("token"); // as execution take time so it retuen token and we can ask
                                                         // later for the result using the token
    }

    /**
     * Polls Judge0 for the result of a previously submitted token.
     * Returns null if still processing (status id 1 or 2).
     */
    @SuppressWarnings("unchecked")
    public Judge0Result getResult(String token) {
        HttpEntity<Void> request = new HttpEntity<>(buildHeaders()); // get req only need headers

        ResponseEntity<Map> response = restTemplate.exchange(
                judge0Url + "/submissions/" + token + "?base64_encoded=true",
                HttpMethod.GET,
                request,
                Map.class);
        log.info("Rsponse = {}", response);
        Map<String, Object> body = response.getBody();
        if (body == null)
            throw new RuntimeException("Empty response from Judge0");

        Map<String, Object> statusObj = (Map<String, Object>) body.get("status");
        int statusId = (int) statusObj.get("id");

        // 1 = In Queue, 2 = Processing — not done yet
        if (statusId <= 2)
            return null;

        String stdout = decode((String) body.get("stdout")); // get program output
        String stderr = decode((String) body.get("stderr")); // get runtime error
        String compileOutput = decode((String) body.get("compile_output")); // get compilation error

        Double time = body.get("time") != null ? Double.parseDouble(body.get("time").toString()) : null;
        Integer memory = body.get("memory") != null ? (Integer) body.get("memory") : null;

        return Judge0Result.builder()
                .statusId(statusId)
                .stdout(stdout)
                .stderr(stderr)
                .compileOutput(compileOutput)
                .timeSeconds(time)
                .memoryKb(memory)
                .build();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
//        headers.set("X-RapidAPI-Key", apiKey);
//        headers.set("X-RapidAPI-Host", "judge0-ce.p.rapidapi.com");
        return headers;
    }

    private String decode(String base64) {
        if (base64 == null)
            return null;
        return new String(Base64.getDecoder().decode(base64)).trim();
    }

    // ─── Result DTO
    @lombok.Data
    @lombok.Builder
    public static class Judge0Result {
        private int statusId;
        private String stdout;
        private String stderr;
        private String compileOutput;
        private Double timeSeconds;
        private Integer memoryKb;

        /**
         * Judge0 status IDs:
         * 3 = Accepted
         * 4 = Wrong Answer
         * 5 = Time Limit Exceeded
         * 6 = Compilation Error
         * 7–12 = Runtime Errors
         * 13 = Internal Error
         * 14 = Exec Format Error
         */
        public boolean isAccepted() {
            return statusId == 3;
        }

        public boolean isWrongAnswer() {
            return statusId == 4;
        }

        public boolean isTLE() {
            return statusId == 5;
        }

        public boolean isCompileError() {
            return statusId == 6;
        }

        public boolean isRuntimeError() {
            return statusId >= 7 && statusId <= 12;
        }
    }
}
