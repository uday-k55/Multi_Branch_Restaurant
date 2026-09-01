package com.restaurant.backend.dto;

import com.restaurant.backend.model.TableStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTableDTO {
    private Long id;
    private String tableNumber;
    private Integer capacity;
    private TableStatus status;
    private String qrCode;
    private Long branchId;
}
