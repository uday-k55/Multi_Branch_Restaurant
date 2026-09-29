package com.restaurant.backend.dto;

import com.restaurant.backend.model.PaymentMethod;
import com.restaurant.backend.model.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentProcessDTO {
    private PaymentStatus status; // PAID or FAILED
    private String transactionId;
    private PaymentMethod paymentMethod;
    private String failureReason;
}

