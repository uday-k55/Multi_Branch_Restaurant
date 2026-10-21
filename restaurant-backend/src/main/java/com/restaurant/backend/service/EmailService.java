package com.restaurant.backend.service;

public interface EmailService {

    /**
     * Send a password reset verification code email via Risu Mail.
     *
     * @param toEmail The recipient's email address.
     * @param otpCode The 6-digit verification code.
     * @throws Exception if sending fails.
     */
    void sendPasswordResetOtp(String toEmail, String otpCode) throws Exception;
}
