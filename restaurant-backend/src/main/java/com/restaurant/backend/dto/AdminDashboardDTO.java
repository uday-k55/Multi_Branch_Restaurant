package com.restaurant.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDTO {
    private long totalBranches;
    private long todaysOrders;
    private double todaysSales;
    private long activeEmployees;
    private long pendingOrders;
    private long pendingDeliveries;
    private long totalReservations;
    private long lowStockItemsCount;
}
