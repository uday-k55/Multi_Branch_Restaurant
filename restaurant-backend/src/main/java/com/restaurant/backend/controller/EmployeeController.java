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

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Role role) {
        List<EmployeeDTO> employees = employeeService.getAllEmployees(branchId, role);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<EmployeeDTO> getEmployeeById(@PathVariable Long id) {
        EmployeeDTO employee = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(employee);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmployeeDTO> createEmployee(@RequestBody CreateEmployeeRequestDTO request) {
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
