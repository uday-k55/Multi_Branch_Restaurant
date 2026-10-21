package com.restaurant.backend.service;

import com.restaurant.backend.dto.ForgotPasswordRequest;
import com.restaurant.backend.dto.ResetPasswordRequest;
import com.restaurant.backend.dto.VerifyOtpRequest;
import com.restaurant.backend.dto.VerifyOtpResponse;

public interface PasswordResetService {

    /**
     * Request a password reset OTP for the given email.
     * Enforces cooldown, invalidates superseded OTPs, sends OTP via Risu Mail,
     * and returns a generic response to prevent email enumeration.
     */
    void requestPasswordReset(ForgotPasswordRequest request);

    /**
     * Verify the supplied OTP for the email.
     * Enforces attempt limits, expiry, and single-use validation.
     * Returns a cryptographically secure random reset token upon success.
     */
    VerifyOtpResponse verifyOtp(VerifyOtpRequest request);

    /**
     * Reset the user's password using the validated reset token.
     * Validates password strength, hashes with BCrypt, updates User entity,
     * and invalidates the token.
     */
    void resetPassword(ResetPasswordRequest request);
}
