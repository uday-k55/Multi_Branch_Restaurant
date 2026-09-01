package com.restaurant.backend.repository;

import com.restaurant.backend.model.Payment;
import com.restaurant.backend.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByOrderId(Long orderId);
    Optional<Payment> findByTransactionId(String transactionId);

    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM Payment p WHERE p.status = :status")
    Double sumAmountByStatus(@Param("status") PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM Payment p WHERE p.status = :status AND p.order.branch.id = :branchId")
    Double sumAmountByStatusAndBranchId(@Param("status") PaymentStatus status, @Param("branchId") Long branchId);
}
