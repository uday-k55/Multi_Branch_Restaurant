package com.restaurant.backend.controller;

import com.restaurant.backend.dto.NotificationDTO;
import com.restaurant.backend.model.OrderStatus;
import com.restaurant.backend.model.Role;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.NotificationService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    @GetMapping("/branch/{branchId}/role/{role}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'CHEF', 'EMPLOYEE')")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForBranchAndRole(
            Authentication authentication,
            @PathVariable Long branchId,
            @PathVariable Role role) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<NotificationDTO> notifications = notificationService.getNotificationsForBranchAndRole(branchId, role);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForUser(
            Authentication authentication,
            @PathVariable Long userId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateUserSelfOrAdmin(currentUser, userId);

        List<NotificationDTO> notifications = notificationService.getNotificationsForUser(userId);
        return ResponseEntity.ok(notifications);
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long notificationId) {
        NotificationDTO updated = notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/events/order-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'CHEF', 'EMPLOYEE')")
    public ResponseEntity<Void> triggerOrderStatusEvent(
            @RequestParam Long orderId,
            @RequestParam OrderStatus newStatus) {
        notificationService.onOrderStatusChanged(orderId, newStatus);
        return ResponseEntity.ok().build();
    }
}
