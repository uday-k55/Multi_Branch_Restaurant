package com.restaurant.backend.dto;

import com.restaurant.backend.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentDTO {
    private Double quantity;
    private TransactionType transactionType; // STOCK_IN, STOCK_OUT, USAGE
    private Double unitPrice;
    private String reason;
    private String referenceNumber;
    private String notes;
}
