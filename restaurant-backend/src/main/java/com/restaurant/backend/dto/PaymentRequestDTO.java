package com.restaurant.backend.dto;

import com.restaurant.backend.model.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestDTO {
    private Long orderId;
    private Double amount;
    private PaymentMethod paymentMethod;
}
