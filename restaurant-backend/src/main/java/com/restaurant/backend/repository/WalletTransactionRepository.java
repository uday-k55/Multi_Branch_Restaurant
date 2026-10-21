package com.restaurant.backend.repository;

import com.restaurant.backend.model.WalletTransaction;
import com.restaurant.backend.model.WalletTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByOrderIdAndType(Long orderId, WalletTransactionType type);
    Optional<WalletTransaction> findByOrderIdAndType(Long orderId, WalletTransactionType type);
}
