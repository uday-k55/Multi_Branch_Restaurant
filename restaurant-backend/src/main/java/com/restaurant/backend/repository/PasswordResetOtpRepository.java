package com.restaurant.backend.repository;

import com.restaurant.backend.model.PasswordResetOtp;
import com.restaurant.backend.model.PasswordResetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByEmailAndStatusOrderByCreatedAtDesc(String email, PasswordResetStatus status);

    Optional<PasswordResetOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    Optional<PasswordResetOtp> findByResetTokenHashAndStatus(String resetTokenHash, PasswordResetStatus status);

    List<PasswordResetOtp> findByEmailAndStatus(String email, PasswordResetStatus status);
}
