package com.restaurant.backend.dto;

import com.restaurant.backend.model.WalletTransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WalletTransactionDTO {
    private Long id;
    private Long orderId;
    private Double amount;
    private WalletTransactionType type;
    private String description;
    private LocalDateTime createdAt;
}
