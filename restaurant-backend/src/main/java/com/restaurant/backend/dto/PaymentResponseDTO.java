package com.restaurant.backend.dto;

import com.restaurant.backend.model.OrderType;
import com.restaurant.backend.model.PaymentMethod;
import com.restaurant.backend.model.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDTO {
    private Long id;
    private Long orderId;
    private OrderType orderType;
    private Long branchId;
    private Double amount;
    private PaymentStatus status;
    private PaymentMethod paymentMethod;
    private String transactionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
