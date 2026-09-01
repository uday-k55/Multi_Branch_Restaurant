package com.restaurant.backend.service;

import com.restaurant.backend.dto.AdminDashboardDTO;
import com.restaurant.backend.model.OrderStatus;
import com.restaurant.backend.model.PaymentStatus;
import com.restaurant.backend.model.Role;
import com.restaurant.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminDashboardService {

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    /**
     * Aggregates real live database statistics for the central Admin Dashboard.
     */
    public AdminDashboardDTO getDashboardOverview() {
        long totalBranches = branchRepository.count();
        long todaysOrders = orderRepository.count();
        double todaysSales = paymentRepository.sumAmountByStatus(PaymentStatus.PAID);
        long activeEmployees = userRepository.countByRoleIn(List.of(Role.BRANCH_MANAGER, Role.CHEF, Role.EMPLOYEE));

        long pendingOrders = orderRepository.countByStatusIn(List.of(
                OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING
        ));

        long pendingDeliveries = orderRepository.countByStatusIn(List.of(
                OrderStatus.AVAILABLE_FOR_DELIVERY, OrderStatus.ACCEPTED,
                OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY
        ));

        long totalReservations = reservationRepository.count();

        long lowStockItemsCount = inventoryItemRepository.findAll().stream()
                .filter(item -> item.getQuantity() <= item.getLowStockThreshold())
                .count();

        return new AdminDashboardDTO(
                totalBranches,
                todaysOrders,
                todaysSales,
                activeEmployees,
                pendingOrders,
                pendingDeliveries,
                totalReservations,
                lowStockItemsCount
        );
    }

    /**
     * Aggregates real live database statistics for a specific branch dashboard.
     */
    public AdminDashboardDTO getBranchDashboardOverview(Long branchId) {
        long totalBranches = 1;
        long todaysOrders = orderRepository.countByBranchIdAndStatusIn(branchId, List.of(OrderStatus.values()));
        double todaysSales = paymentRepository.sumAmountByStatusAndBranchId(PaymentStatus.PAID, branchId);
        long activeEmployees = userRepository.countByBranchIdAndRoleIn(branchId, List.of(Role.BRANCH_MANAGER, Role.CHEF, Role.EMPLOYEE));

        long pendingOrders = orderRepository.countByBranchIdAndStatusIn(branchId, List.of(
                OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING
        ));

        long pendingDeliveries = orderRepository.countByBranchIdAndStatusIn(branchId, List.of(
                OrderStatus.AVAILABLE_FOR_DELIVERY, OrderStatus.ACCEPTED,
                OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY
        ));

        long totalReservations = reservationRepository.findByBranchId(branchId).size();

        long lowStockItemsCount = inventoryItemRepository.findLowStockItemsByBranchId(branchId).size();

        return new AdminDashboardDTO(
                totalBranches,
                todaysOrders,
                todaysSales,
                activeEmployees,
                pendingOrders,
                pendingDeliveries,
                totalReservations,
                lowStockItemsCount
        );
    }

    public com.restaurant.backend.dto.ReportDTO getReports(Long branchId) {
        List<com.restaurant.backend.model.Order> orders = branchId != null ?
                orderRepository.findByBranchIdOrderByCreatedAtDesc(branchId) :
                orderRepository.findAll();

        long totalOrders = orders.size();
        double totalRevenue = paymentRepository.sumAmountByStatus(PaymentStatus.PAID);
        if (branchId != null) {
            totalRevenue = paymentRepository.sumAmountByStatusAndBranchId(PaymentStatus.PAID, branchId);
        }

        java.util.Map<String, Long> ordersByType = orders.stream()
                .collect(java.util.stream.Collectors.groupingBy(o -> o.getOrderType().name(), java.util.stream.Collectors.counting()));

        java.util.Map<String, Long> ordersByStatus = orders.stream()
                .collect(java.util.stream.Collectors.groupingBy(o -> o.getStatus().name(), java.util.stream.Collectors.counting()));

        List<com.restaurant.backend.model.Reservation> reservations = branchId != null ?
                reservationRepository.findByBranchId(branchId) :
                reservationRepository.findAll();

        java.util.Map<String, Long> reservationsByStatus = reservations.stream()
                .collect(java.util.stream.Collectors.groupingBy(r -> r.getStatus().name(), java.util.stream.Collectors.counting()));

        List<com.restaurant.backend.model.InventoryItem> invItems = branchId != null ?
                inventoryItemRepository.findByBranchId(branchId) :
                inventoryItemRepository.findAll();

        long totalInventoryItems = invItems.size();
        long lowStockCount = invItems.stream().filter(i -> i.getQuantity() <= i.getLowStockThreshold()).count();

        List<com.restaurant.backend.dto.ReportDTO.BranchSalesSummaryDTO> branchSummaries = branchRepository.findAll().stream()
                .map(b -> {
                    long count = orderRepository.countByBranchIdAndStatusIn(b.getId(), java.util.List.of(OrderStatus.values()));
                    double sales = paymentRepository.sumAmountByStatusAndBranchId(PaymentStatus.PAID, b.getId());
                    return new com.restaurant.backend.dto.ReportDTO.BranchSalesSummaryDTO(b.getId(), b.getName(), count, sales);
                })
                .collect(java.util.stream.Collectors.toList());

        return new com.restaurant.backend.dto.ReportDTO(
                totalOrders,
                totalRevenue,
                ordersByType,
                ordersByStatus,
                reservationsByStatus,
                totalInventoryItems,
                lowStockCount,
                branchSummaries
        );
    }
}
