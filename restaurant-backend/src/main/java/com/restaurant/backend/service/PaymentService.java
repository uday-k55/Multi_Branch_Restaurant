package com.restaurant.backend.service;

import com.restaurant.backend.dto.PaymentProcessDTO;
import com.restaurant.backend.dto.PaymentRequestDTO;
import com.restaurant.backend.dto.PaymentResponseDTO;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.OrderRepository;
import com.restaurant.backend.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    public PaymentResponseDTO initiatePayment(PaymentRequestDTO dto) {
        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found with id: " + dto.getOrderId()));

        // Check if existing pending or paid payment exists
        Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(new Payment());

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Order #" + order.getId() + " is already paid.");
        }

        payment.setOrder(order);
        payment.setAmount(dto.getAmount());
        payment.setPaymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : PaymentMethod.DEMO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setTransactionId("TXN-DEMO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payment.setUpdatedAt(LocalDateTime.now());

        Payment saved = paymentRepository.save(payment);
        return mapToDTO(saved);
    }

    @Transactional
    public PaymentResponseDTO processDemoPayment(Long paymentId, PaymentProcessDTO dto) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found with id: " + paymentId));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Payment already processed and marked as PAID.");
        }

        PaymentStatus newStatus = dto.getStatus() != null ? dto.getStatus() : PaymentStatus.PAID;
        payment.setStatus(newStatus);
        if (dto.getPaymentMethod() != null) {
            payment.setPaymentMethod(dto.getPaymentMethod());
        }
        if (dto.getTransactionId() != null && !dto.getTransactionId().isBlank()) {
            payment.setTransactionId(dto.getTransactionId());
        }
        payment.setUpdatedAt(LocalDateTime.now());

        // Update associated order status if payment succeeded
        if (newStatus == PaymentStatus.PAID) {
            Order order = payment.getOrder();
            if (order != null) {
                order.setStatus(OrderStatus.PLACED); // Order confirmed & placed upon payment completion
                orderRepository.save(order);
            }
        }

        Payment updated = paymentRepository.save(payment);
        return mapToDTO(updated);
    }

    @Transactional
    public PaymentResponseDTO refundPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found with id: " + paymentId));

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new IllegalStateException("Only PAID transactions can be refunded.");
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setUpdatedAt(LocalDateTime.now());

        Payment updated = paymentRepository.save(payment);
        return mapToDTO(updated);
    }

    public PaymentResponseDTO getPaymentByOrder(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("No payment record found for order id: " + orderId));
        return mapToDTO(payment);
    }

    private PaymentResponseDTO mapToDTO(Payment payment) {
        Order order = payment.getOrder();
        return new PaymentResponseDTO(
                payment.getId(),
                order != null ? order.getId() : null,
                order != null ? order.getOrderType() : null,
                order != null && order.getBranch() != null ? order.getBranch().getId() : null,
                payment.getAmount(),
                payment.getStatus(),
                payment.getPaymentMethod(),
                payment.getTransactionId(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
