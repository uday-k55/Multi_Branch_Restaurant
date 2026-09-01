package com.restaurant.backend.controller;

import com.restaurant.backend.dto.AdminDashboardDTO;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.AdminDashboardService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDashboardDTO> getDashboardOverview() {
        AdminDashboardDTO dashboard = adminDashboardService.getDashboardOverview();
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<AdminDashboardDTO> getBranchDashboardOverview(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        AdminDashboardDTO dashboard = adminDashboardService.getBranchDashboardOverview(branchId);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<com.restaurant.backend.dto.ReportDTO> getReports(
            Authentication authentication,
            @RequestParam(required = false) Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        if (currentUser.getRole() == com.restaurant.backend.model.Role.BRANCH_MANAGER) {
            branchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
        }
        if (branchId != null) {
            branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        }
        com.restaurant.backend.dto.ReportDTO reports = adminDashboardService.getReports(branchId);
        return ResponseEntity.ok(reports);
    }
}
