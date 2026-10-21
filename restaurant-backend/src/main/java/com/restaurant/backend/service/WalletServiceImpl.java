package com.restaurant.backend.service;

import com.restaurant.backend.dto.WalletDTO;
import com.restaurant.backend.dto.WalletTransactionDTO;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.PaymentRepository;
import com.restaurant.backend.repository.UserRepository;
import com.restaurant.backend.repository.WalletTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WalletServiceImpl implements WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletTransactionRepository walletTransactionRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Override
    @Transactional(readOnly = true)
    public WalletDTO getWallet(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }
        if (currentUser.getRole() != Role.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Wallet is only accessible to customers");
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<WalletTransaction> transactions = walletTransactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        List<WalletTransactionDTO> txDtos = transactions.stream().map(tx -> new WalletTransactionDTO(
                tx.getId(),
                tx.getOrder() != null ? tx.getOrder().getId() : null,
                tx.getAmount(),
                tx.getType(),
                tx.getDescription(),
                tx.getCreatedAt()
        )).collect(Collectors.toList());

        return new WalletDTO(user.getWalletBalance(), txDtos);
    }

    @Override
    @Transactional
    public WalletTransaction processOrderCancellationRefund(Order order) {
        if (order == null || order.getId() == null) {
            log.warn("[WalletRefund] Cannot process refund for null order");
            return null;
        }

        // Rule D: Prevent duplicate refunds check
        if (walletTransactionRepository.existsByOrderIdAndType(order.getId(), WalletTransactionType.REFUND)) {
            log.warn("[WalletRefund] Refund already processed for order #{}", order.getId());
            return null;
        }

        // Retrieve existing payment record for this order
        Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
        if (payment == null) {
            log.info("[WalletRefund] No payment record found for order #{}. No refund credited.", order.getId());
            return null;
        }

        // Rule A, B, C: Check payment status and payment method
        // Only orders that are actually PAID are eligible for refund.
        // Unpaid COD (status PENDING), failed payments (status FAILED), or already refunded are excluded.
        if (payment.getStatus() != PaymentStatus.PAID) {
            log.info("[WalletRefund] Order #{} payment status is '{}' (not PAID). No refund credited.", order.getId(), payment.getStatus());
            return null;
        }

        Double eligibleAmount = payment.getAmount();
        if (eligibleAmount == null || eligibleAmount <= 0.0) {
            log.info("[WalletRefund] Order #{} payment amount is 0 or negative. No refund credited.", order.getId());
            return null;
        }

        User orderUser = order.getUser();
        if (orderUser == null) {
            log.error("[WalletRefund] Order #{} has no associated customer user.", order.getId());
            return null;
        }

        // Acquire pessimistic lock on user for safe balance update
        User customer = userRepository.findByIdWithLock(orderUser.getId())
                .orElse(orderUser);

        double currentBalance = customer.getWalletBalance();
        double updatedBalance = Math.round((currentBalance + eligibleAmount) * 100.0) / 100.0;
        customer.setWalletBalance(updatedBalance);
        userRepository.save(customer);

        // Record the transaction
        WalletTransaction transaction = new WalletTransaction();
        transaction.setUser(customer);
        transaction.setOrder(order);
        transaction.setAmount(eligibleAmount);
        transaction.setType(WalletTransactionType.REFUND);
        transaction.setDescription("Refund for cancelled order #" + order.getId());
        transaction.setCreatedAt(LocalDateTime.now());
        WalletTransaction savedTx = walletTransactionRepository.save(transaction);

        // Update payment status to REFUNDED
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        log.info("[WalletRefund] Successfully credited refund of ₹{} to customer {} (userId: {}) for cancelled order #{}",
                eligibleAmount, customer.getEmail(), customer.getId(), order.getId());

        return savedTx;
    }
}
