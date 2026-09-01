package com.restaurant.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportDTO {
    private long totalOrders;
    private double totalRevenue;
    private Map<String, Long> ordersByType;
    private Map<String, Long> ordersByStatus;
    private Map<String, Long> reservationsByStatus;
    private long totalInventoryItems;
    private long lowStockCount;
    private List<BranchSalesSummaryDTO> branchSalesSummaries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BranchSalesSummaryDTO {
        private Long branchId;
        private String branchName;
        private long orderCount;
        private double totalSales;
    }
}
