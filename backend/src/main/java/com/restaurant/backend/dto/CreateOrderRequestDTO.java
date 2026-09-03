package com.restaurant.backend.dto;

import com.restaurant.backend.model.OrderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequestDTO {
    private Long branchId;
    private OrderType orderType;
    private Long tableId;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
    private List<OrderItemRequestDTO> items;
}
