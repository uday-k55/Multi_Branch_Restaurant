package com.restaurant.backend.dto;

import com.restaurant.backend.model.OrderStatus;
import com.restaurant.backend.model.OrderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {
    private Long id;
    private Long userId;
    private String customerName;
    private Long branchId;
    private String branchName;
    private OrderType orderType;
    private OrderStatus status;
    private Long tableId;
    private String tableNumber;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
    private Double subtotal;
    private Double totalAmount;
    private Long assignedEmployeeId;
    private String assignedEmployeeName;
    private LocalDateTime createdAt;
    private List<OrderItemDTO> items;
}
