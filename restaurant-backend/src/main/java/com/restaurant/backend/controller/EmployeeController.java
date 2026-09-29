package com.restaurant.backend.controller;

import com.restaurant.backend.dto.CreateEmployeeRequestDTO;
import com.restaurant.backend.dto.EmployeeDTO;
import com.restaurant.backend.model.Role;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/admin/employees", "/api/employees"})
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private com.restaurant.backend.util.BranchSecurityUtils branchSecurityUtils;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees(
            Authentication authentication,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Role role) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        if (currentUser.getRole() == Role.BRANCH_MANAGER) {
            Long managerBranchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
            if (managerBranchId == null) {
                return ResponseEntity.ok(List.of());
            }
            if (branchId != null && !branchId.equals(managerBranchId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Access Denied: You can only view employees from your assigned branch");
            }
            branchId = managerBranchId;
        }
        List<EmployeeDTO> employees = employeeService.getAllEmployees(branchId, role);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<EmployeeDTO> getEmployeeById(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        EmployeeDTO employee = employeeService.getEmployeeById(id);
        if (currentUser.getRole() == Role.BRANCH_MANAGER) {
            Long managerBranchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
            if (managerBranchId == null || !managerBranchId.equals(employee.getBranchId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Access Denied: You can only view employees from your assigned branch");
            }
        }
        return ResponseEntity.ok(employee);
    }


    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<EmployeeDTO> createEmployee(
            Authentication authentication,
            @RequestBody CreateEmployeeRequestDTO request) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        if (currentUser.getRole() == Role.BRANCH_MANAGER) {
            Long managerBranchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
            if (managerBranchId == null) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN, "You are not assigned to a branch. Please contact the administrator.");
            }
            request.setBranchId(managerBranchId);
            if (request.getRole() == null || (request.getRole() != Role.EMPLOYEE && request.getRole() != Role.CHEF)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Branch Managers can only create EMPLOYEE or CHEF roles.");
            }
        }
        EmployeeDTO created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmployeeDTO> updateEmployee(
            @PathVariable Long id,
            @RequestBody CreateEmployeeRequestDTO request) {
        EmployeeDTO updated = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable Long id,
            Authentication authentication) {
        String currentAdminEmail = "";
        if (authentication != null) {
            if (authentication.getPrincipal() instanceof User u) {
                currentAdminEmail = u.getEmail();
            } else {
                currentAdminEmail = authentication.getName();
            }
        }
        employeeService.deleteEmployee(id, currentAdminEmail);
        return ResponseEntity.noContent().build();
    }
}
