package com.restaurant.backend.service;

import com.restaurant.backend.dto.ForgotPasswordRequest;
import com.restaurant.backend.dto.ResetPasswordRequest;
import com.restaurant.backend.dto.VerifyOtpRequest;
import com.restaurant.backend.dto.VerifyOtpResponse;
import com.restaurant.backend.model.PasswordResetOtp;
import com.restaurant.backend.model.PasswordResetStatus;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.PasswordResetOtpRepository;
import com.restaurant.backend.repository.UserRepository;
import com.restaurant.backend.util.HashUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetServiceImpl.class);

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int TOKEN_EXPIRY_MINUTES = 15;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public PasswordResetServiceImpl(UserRepository userRepository,
                                    PasswordResetOtpRepository otpRepository,
                                    PasswordEncoder passwordEncoder,
                                    EmailService emailService) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is required");
        }

        String email = request.getEmail().trim().toLowerCase();

        // 1. Enforce 60-second cooldown per email
        Optional<PasswordResetOtp> latestAttempt = otpRepository.findTopByEmailOrderByCreatedAtDesc(email);
        if (latestAttempt.isPresent()) {
            LocalDateTime cooldownExpiry = latestAttempt.get().getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
            if (LocalDateTime.now().isBefore(cooldownExpiry)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait 60 seconds before requesting a new verification code.");
            }
        }

        // 2. Invalidate any existing PENDING recovery attempts for this email
        List<PasswordResetOtp> pendingList = otpRepository.findByEmailAndStatus(email, PasswordResetStatus.PENDING);
        for (PasswordResetOtp existing : pendingList) {
            existing.setStatus(PasswordResetStatus.EXPIRED);
            otpRepository.save(existing);
        }

        // 3. User existence check (Anti-enumeration: return normally if user does not exist)
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.info("[PasswordReset] Request received for non-existent email domain; generic response returned.");
            return;
        }

        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getBlacklisted())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This account has been blacklisted. Please contact the restaurant administrator.");
        }

        // 4. Generate and hash 6-digit OTP
        String rawOtp = HashUtils.generate6DigitOtp();
        String otpHash = HashUtils.sha256Hex(rawOtp);

        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setEmail(email);
        resetOtp.setOtpHash(otpHash);
        resetOtp.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        resetOtp.setFailedAttempts(0);
        resetOtp.setStatus(PasswordResetStatus.PENDING);
        resetOtp.setCreatedAt(LocalDateTime.now());
        resetOtp.setUpdatedAt(LocalDateTime.now());

        PasswordResetOtp savedRecord = otpRepository.save(resetOtp);

        // 5. Send OTP via Risu Mail
        try {
            emailService.sendPasswordResetOtp(email, rawOtp);
        } catch (Exception e) {
            log.error("[PasswordReset] Failed to deliver OTP email to provider for email domain: {}", e.getMessage());
            savedRecord.setStatus(PasswordResetStatus.FAILED);
            otpRepository.save(savedRecord);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Unable to send verification email. Please verify mail configuration or try again later.");
        }
    }

    @Override
    @Transactional
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {
        if (request == null || request.getEmail() == null || request.getOtp() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and verification code are required");
        }

        String email = request.getEmail().trim().toLowerCase();
        String inputOtp = request.getOtp().trim();

        PasswordResetOtp record = otpRepository.findTopByEmailAndStatusOrderByCreatedAtDesc(email, PasswordResetStatus.PENDING)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No active verification code found for this email. Please request a new code."));

        // Check expiration
        if (record.getOtpExpiresAt().isBefore(LocalDateTime.now())) {
            record.setStatus(PasswordResetStatus.EXPIRED);
            otpRepository.save(record);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Verification code has expired. Please request a new code.");
        }

        // Check attempt threshold
        if (record.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            record.setStatus(PasswordResetStatus.EXHAUSTED);
            otpRepository.save(record);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Maximum verification attempts exceeded. Please request a new code.");
        }

        // Constant-time hash verification
        String inputOtpHash = HashUtils.sha256Hex(inputOtp);
        boolean matches = HashUtils.constantTimeEquals(inputOtpHash, record.getOtpHash());

        if (!matches) {
            record.setFailedAttempts(record.getFailedAttempts() + 1);
            if (record.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                record.setStatus(PasswordResetStatus.EXHAUSTED);
            }
            otpRepository.save(record);

            int remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.getFailedAttempts());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid verification code. " + remaining + " attempts remaining.");
        }

        // Valid OTP -> Issue short-lived, single-use password reset token
        String rawResetToken = HashUtils.generateSecureToken();
        String resetTokenHash = HashUtils.sha256Hex(rawResetToken);

        record.setStatus(PasswordResetStatus.VERIFIED);
        record.setResetTokenHash(resetTokenHash);
        record.setTokenExpiresAt(LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES));
        otpRepository.save(record);

        return new VerifyOtpResponse("Verification code verified successfully.", rawResetToken);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request == null || request.getResetToken() == null || request.getNewPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token and new password are required");
        }

        String rawToken = request.getResetToken().trim();
        String newPassword = request.getNewPassword().trim();

        // Validate password complexity
        validatePasswordComplexity(newPassword);

        String tokenHash = HashUtils.sha256Hex(rawToken);

        PasswordResetOtp record = otpRepository.findByResetTokenHashAndStatus(tokenHash, PasswordResetStatus.VERIFIED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid or expired password reset session. Please request a new code."));

        if (record.getTokenExpiresAt() == null || record.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            record.setStatus(PasswordResetStatus.EXPIRED);
            otpRepository.save(record);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password reset session has expired. Please request a new verification code.");
        }

        User user = userRepository.findByEmail(record.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated user account not found"));

        if (Boolean.TRUE.equals(user.getBlacklisted())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This account has been blacklisted. Please contact the administrator.");
        }

        // Update password with BCrypt
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate reset token and mark USED
        record.setStatus(PasswordResetStatus.USED);
        record.setResetTokenHash(null); // Clear hash to prevent any potential reuse
        otpRepository.save(record);

        log.info("[PasswordReset] Password reset successfully executed for user account.");
    }

    private void validatePasswordComplexity(String password) {
        if (password.length() < 6 || password.length() > 32) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be between 6 and 32 characters in length.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must contain at least one uppercase letter (A-Z).");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must contain at least one number (0-9).");
        }
        if (!password.matches(".*[^a-zA-Z0-9].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must contain at least one special character.");
        }
    }
}
