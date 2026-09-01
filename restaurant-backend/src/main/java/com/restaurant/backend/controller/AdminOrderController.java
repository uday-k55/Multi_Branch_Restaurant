package com.restaurant.backend.controller;

import com.restaurant.backend.dto.OrderDTO;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.OrderService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderDTO>> getAllOrders(Authentication authentication) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        List<OrderDTO> orders = orderService.getAllOrdersForAdmin(currentUser);
        return ResponseEntity.ok(orders);
    }
}
