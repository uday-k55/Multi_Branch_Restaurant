package com.restaurant.backend.controller;

import com.restaurant.backend.dto.CreateOrderRequestDTO;
import com.restaurant.backend.dto.OrderDTO;
import com.restaurant.backend.model.OrderStatus;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.OrderService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    private User getAuthenticatedUser(Authentication authentication) {
        return branchSecurityUtils.getAuthenticatedUser(authentication);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<OrderDTO> createOrder(
            Authentication authentication,
            @RequestBody CreateOrderRequestDTO dto) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO created = orderService.createOrder(currentUser, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderDTO>> getMyOrders(Authentication authentication) {
        User currentUser = getAuthenticatedUser(authentication);
        List<OrderDTO> orders = orderService.getMyOrders(currentUser);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderDTO> getOrderById(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO order = orderService.getOrderById(currentUser, id);
        return ResponseEntity.ok(order);
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'CHEF', 'EMPLOYEE')")
    public ResponseEntity<List<OrderDTO>> getBranchOrders(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = getAuthenticatedUser(authentication);
        List<OrderDTO> orders = orderService.getBranchOrders(currentUser, branchId);
        return ResponseEntity.ok(orders);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'CHEF', 'EMPLOYEE')")
    public ResponseEntity<OrderDTO> updateOrderStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO updated = orderService.updateOrderStatus(currentUser, id, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/branches/{branchId}/available-deliveries")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<OrderDTO>> getAvailableDeliveries(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = getAuthenticatedUser(authentication);
        List<OrderDTO> deliveries = orderService.getAvailableDeliveriesForBranch(currentUser, branchId);
        return ResponseEntity.ok(deliveries);
    }

    @GetMapping("/my-deliveries")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<List<OrderDTO>> getMyAssignedDeliveries(Authentication authentication) {
        User currentUser = getAuthenticatedUser(authentication);
        List<OrderDTO> deliveries = orderService.getMyAssignedDeliveries(currentUser);
        return ResponseEntity.ok(deliveries);
    }

    @PostMapping("/{id}/accept-delivery")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<OrderDTO> acceptDelivery(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO accepted = orderService.acceptDelivery(currentUser, id);
        return ResponseEntity.ok(accepted);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderDTO> cancelOrder(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO cancelled = orderService.cancelOrder(currentUser, id);
        return ResponseEntity.ok(cancelled);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderDTO> updateOrder(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody com.restaurant.backend.dto.UpdateOrderRequestDTO dto) {
        User currentUser = getAuthenticatedUser(authentication);
        OrderDTO updated = orderService.updateOrderItems(currentUser, id, dto);
        return ResponseEntity.ok(updated);
    }
}
