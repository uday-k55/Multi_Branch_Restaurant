package com.restaurant.backend.dto;

import com.restaurant.backend.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryTransactionDTO {
    private Long id;
    private Long inventoryItemId;
    private String inventoryItemName;
    private TransactionType transactionType;
    private Double quantityChange;
    private Double resultingQuantity;
    private String notes;
    private LocalDateTime createdAt;
}
