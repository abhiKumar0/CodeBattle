package com.codebattle.notification;


import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;



    // ─── Core send (async so it never blocks HTTP thread) ─────────────────────

    @Async("judge0Executor")
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.debug("Email sent to {}: {}", to, subject);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }


    // ─── Email verification ───────────────────────────────────────────────────

    public void sendVerificationEmail(String to, String username, String token) {
        String verifyUrl = frontendUrl + "/auth/verify-email?token=" + token;
        String subject = "Verify your email — CodeBattle";
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
                            background:#1a1a2e;border-radius:8px;padding:32px;color:#e0e0e0">
                  <div style="text-align:center;margin-bottom:24px">
                    <span style="font-size:36px">⚔️</span>
                    <h2 style="color:#22c55e;margin:8px 0 0;letter-spacing:2px">CODEBATTLE</h2>
                  </div>
                  <p style="color:#ccc">Hey <strong style="color:#22c55e">%s</strong>,</p>
                  <p style="color:#aaa">You're almost ready to enter the arena. Click the button below to verify
                     your email and activate your account.</p>
                  <div style="text-align:center;margin:28px 0">
                    <a href="%s"
                       style="background:#22c55e;color:#0a0a0a;padding:14px 32px;
                              border-radius:6px;text-decoration:none;display:inline-block;
                              font-weight:bold;font-size:14px;letter-spacing:1px">
                      VERIFY EMAIL
                    </a>
                  </div>
                  <p style="color:#666;font-size:12px;text-align:center">
                    This link expires in 15 minutes. If you didn't request this, just ignore this email.
                  </p>
                  <hr style="border:none;border-top:1px solid #2a2a3e;margin:24px 0"/>
                  <p style="color:#555;font-size:11px;text-align:center">
                    CodeBattle — sharpen your skills, one battle at a time.
                  </p>
                </div>
                """.formatted(username, verifyUrl);
        sendHtml(to, subject, body);
    }

    // ─── Password reset email ─────────────────────────────────────────────────

    public void sendPasswordReset(String to, String username, String token) {
        String resetUrl = frontendUrl + "/auth/reset-password?token=" + token;
        String subject = "Reset your password — CodeBattle";
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
                            background:#1a1a2e;border-radius:8px;padding:32px;color:#e0e0e0">
                  <div style="text-align:center;margin-bottom:24px">
                    <span style="font-size:36px">🔑</span>
                    <h2 style="color:#22c55e;margin:8px 0 0;letter-spacing:2px">CODEBATTLE</h2>
                  </div>
                  <p style="color:#ccc">Hey <strong style="color:#22c55e">%s</strong>,</p>
                  <p style="color:#aaa">We received a request to reset your password.
                     Click the button below to choose a new one.</p>
                  <div style="text-align:center;margin:28px 0">
                    <a href="%s"
                       style="background:#22c55e;color:#0a0a0a;padding:14px 32px;
                              border-radius:6px;text-decoration:none;display:inline-block;
                              font-weight:bold;font-size:14px;letter-spacing:1px">
                      RESET PASSWORD
                    </a>
                  </div>
                  <p style="color:#666;font-size:12px;text-align:center">
                    This link expires in 15 minutes. If you didn't request this, you can safely ignore it.
                  </p>
                  <hr style="border:none;border-top:1px solid #2a2a3e;margin:24px 0"/>
                  <p style="color:#555;font-size:11px;text-align:center">
                    CodeBattle — sharpen your skills, one battle at a time.
                  </p>
                </div>
                """.formatted(username, resetUrl);
        sendHtml(to, subject, body);
    }


    // ─── Welcome email ────────────────────────────────────────────────────────

    public void sendWelcome(String to, String username) {
        String subject = "Welcome to CodeBattle, " + username + "!";
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
                  <h2 style="color:#6366f1">Welcome to CodeBattle ⚔️</h2>
                  <p>Hey <strong>%s</strong>,</p>
                  <p>Your account is ready. Start battling developers in real-time coding duels!</p>
                  <a href="%s/match/random"
                     style="background:#6366f1;color:white;padding:12px 24px;
                            border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">
                    Find a Match
                  </a>
                  <p style="margin-top:24px;color:#888;font-size:12px">
                    CodeBattle — sharpen your skills, one battle at a time.
                  </p>
                </div>
                """.formatted(username, frontendUrl);
        sendHtml(to, subject, body);
    }


    // ─── Daily problem notification ───────────────────────────────────────────

    public void sendDailyProblem(String to, String username,
                                 String problemTitle, String difficulty,
                                 String problemId) {
        String color = switch (difficulty) {
            case "EASY"   -> "#22c55e";
            case "MEDIUM" -> "#f59e0b";
            case "HARD"   -> "#ef4444";
            default       -> "#6366f1";
        };

        String subject = "🧩 Daily Problem: " + problemTitle;
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
                  <h2 style="color:#6366f1">Daily Coding Challenge</h2>
                  <p>Hey <strong>%s</strong>, today's problem is ready!</p>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
                    <h3 style="margin:0 0 8px">%s</h3>
                    <span style="background:%s;color:white;padding:4px 10px;
                                 border-radius:4px;font-size:12px;font-weight:bold">
                      %s
                    </span>
                  </div>
                  <a href="%s/problems/%s"
                     style="background:#6366f1;color:white;padding:12px 24px;
                            border-radius:6px;text-decoration:none;display:inline-block">
                    Solve Now
                  </a>
                  <p style="margin-top:24px;color:#888;font-size:12px">
                    Don't break your streak! 🔥
                  </p>
                </div>
                """.formatted(username, problemTitle, color, difficulty, frontendUrl, problemId);

        sendHtml(to, subject, body);
    }

    // ─── Match result notification ────────────────────────────────────────────

    public void sendMatchResult(String to, String username, boolean won,
                                String opponentUsername, int ratingChange, int newRating) {
        String resultText = won ? "You Won! 🏆" : "You Lost 😤";
        String resultColor = won ? "#22c55e" : "#ef4444";
        String sign = ratingChange >= 0 ? "+" : "";

        String subject = won
                ? "Victory! You beat " + opponentUsername
                : "Defeat against " + opponentUsername + " — rematch?";

        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
                  <h2 style="color:%s">%s</h2>
                  <p>Hey <strong>%s</strong>, your match vs <strong>%s</strong> is over.</p>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;
                              display:flex;gap:24px;margin:16px 0">
                    <div>
                      <div style="color:#888;font-size:12px">Rating Change</div>
                      <div style="font-size:24px;font-weight:bold;color:%s">%s%d</div>
                    </div>
                    <div>
                      <div style="color:#888;font-size:12px">New Rating</div>
                      <div style="font-size:24px;font-weight:bold">%d</div>
                    </div>
                  </div>
                  <a href="%s/match/random"
                     style="background:#6366f1;color:white;padding:12px 24px;
                            border-radius:6px;text-decoration:none;display:inline-block">
                    Play Again
                  </a>
                </div>
                """.formatted(resultColor, resultText, username, opponentUsername,
                resultColor, sign, ratingChange, newRating, frontendUrl);

        sendHtml(to, subject, body);
    }

    // ─── Achievement unlocked ─────────────────────────────────────────────────

    public void sendAchievementUnlocked(String to, String username,
                                        String achievementTitle,
                                        String achievementDescription,
                                        int xpReward) {
        String subject = "🏅 Achievement Unlocked: " + achievementTitle;
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
                  <h2 style="color:#6366f1">Achievement Unlocked! 🏅</h2>
                  <p>Hey <strong>%s</strong>, you just earned a new achievement!</p>
                  <div style="border:2px solid #6366f1;border-radius:8px;padding:20px;margin:16px 0">
                    <h3 style="margin:0 0 8px;color:#6366f1">%s</h3>
                    <p style="margin:0 0 12px;color:#4b5563">%s</p>
                    <span style="background:#fef3c7;color:#d97706;padding:4px 10px;
                                 border-radius:4px;font-size:13px;font-weight:bold">
                      +%d XP
                    </span>
                  </div>
                  <a href="%s/profile"
                     style="background:#6366f1;color:white;padding:12px 24px;
                            border-radius:6px;text-decoration:none;display:inline-block">
                    View Profile
                  </a>
                </div>
                """.formatted(username, achievementTitle, achievementDescription,
                xpReward, frontendUrl);

        sendHtml(to, subject, body);
    }
}
