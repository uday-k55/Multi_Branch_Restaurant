package com.restaurant.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDTO {
    private Long id;
    private Long foodItemId;
    private String foodItemName;
    private Integer quantity;
    private Double pricePerUnit;
    private Double subtotal;
}
