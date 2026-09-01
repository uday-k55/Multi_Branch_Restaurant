package com.restaurant.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FoodItemDTO {
    private Long id;
    private String name;
    private String description;
    private Double price;
    private String imageUrl;
    private Boolean enabled = true;
    private Boolean isSeasonal = false;
    private Long categoryId;
    private String categoryName;
    private Long branchId;
}
