package com.restaurant.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class RisuMailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(RisuMailServiceImpl.class);

    @Value("${RISU_API_URL:https://api.risu.in/v1/send}")
    private String apiUrl;

    @Value("${RISU_API_KEY:}")
    private String apiKey;

    @Value("${RISU_FROM_EMAIL:noreply@beefwithchefmelbin.com}")
    private String fromEmail;

    private final HttpClient httpClient;

    public RisuMailServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public void sendPasswordResetOtp(String toEmail, String otpCode) throws Exception {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.error("[RisuMail] Unable to send email: RISU_API_KEY environment variable is not configured.");
            throw new IllegalStateException("Email service is not configured. Please set RISU_API_KEY.");
        }

        String subject = "Beef With Chef Melbin - Password Reset Verification Code";
        String htmlContent = buildHtmlTemplate(otpCode);
        String textContent = buildTextTemplate(otpCode);

        String jsonBody = "{"
                + "\"from\":\"" + escapeJson(fromEmail) + "\","
                + "\"to\":\"" + escapeJson(toEmail) + "\","
                + "\"subject\":\"" + escapeJson(subject) + "\","
                + "\"html\":\"" + escapeJson(htmlContent) + "\","
                + "\"text\":\"" + escapeJson(textContent) + "\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("[RisuMail] Password reset verification email sent successfully to recipient domain.");
        } else {
            log.error("[RisuMail] Email delivery failed with HTTP status code: {}", response.statusCode());
            throw new RuntimeException("Risu Mail API returned HTTP status " + response.statusCode());
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < ' ') {
                        String t = "000" + Integer.toHexString(ch);
                        sb.append("\\u").append(t.substring(t.length() - 4));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        return sb.toString();
    }

    private String buildHtmlTemplate(String otpCode) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset Code</title>
              <style>
                body { margin: 0; padding: 0; background-color: #0f172b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff; }
                .email-container { max-width: 560px; margin: 40px auto; background-color: #1a2238; border-radius: 14px; overflow: hidden; border: 1px solid #2d3748; }
                .header { background: linear-gradient(135deg, #0f172b 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #FEA116; }
                .brand-title { color: #FEA116; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 0.5px; }
                .brand-subtitle { color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
                .body { padding: 36px 32px; background-color: #1a2238; }
                .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #ffffff; }
                .message { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
                .otp-box { background: #0f172b; border: 2px dashed #FEA116; border-radius: 12px; padding: 22px; text-align: center; margin: 28px 0; }
                .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #FEA116; margin: 0; font-family: monospace; }
                .expiry-notice { font-size: 13px; color: #f59e0b; margin-top: 10px; font-weight: 500; }
                .warning-box { background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 24px 0; font-size: 13px; color: #fca5a5; line-height: 1.5; }
                .footer { padding: 24px 32px; background-color: #0f172b; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #2d3748; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <h1 class="brand-title">Beef With Chef Melbin</h1>
                  <p class="brand-subtitle">Multi-Branch Restaurant Ordering & Management System</p>
                </div>
                <div class="body">
                  <div class="greeting">Password Reset Request</div>
                  <p class="message">
                    We received a request to reset the password for your account. Use the verification code below to complete your password reset:
                  </p>
                  <div class="otp-box">
                    <p class="otp-code">{{OTP}}</p>
                    <p class="expiry-notice">&#9200; This code expires in 5 minutes</p>
                  </div>
                  <div class="warning-box">
                    <strong>Security Warning:</strong> Never share this code with anyone. Beef With Chef Melbin staff will never ask for your verification code.
                  </div>
                  <p class="message" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                    If you did not request a password reset, you can safely ignore this email. Your account remains completely secure.
                  </p>
                </div>
                <div class="footer">
                  &copy; Beef With Chef Melbin Restaurant Management System. All rights reserved.
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{OTP}}", otpCode);
    }

    private String buildTextTemplate(String otpCode) {
        String template = """
            Beef With Chef Melbin - Password Reset Verification Code

            We received a request to reset your password.
            Your verification code is: {{OTP}}

            This code expires in 5 minutes.
            Never share this code with anyone.

            If you did not request this, please ignore this email.
            """;
        return template.replace("{{OTP}}", otpCode);
    }
}
