package com.restaurant.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItemDTO {
    private Long id;
    private String name;
    private Double quantity;
    private String unit;
    private Double lowStockThreshold;
    
    @JsonProperty("isLowStock")
    private Boolean isLowStock;
    
    private Long categoryId;
    private String categoryName;
    private Long branchId;
}
