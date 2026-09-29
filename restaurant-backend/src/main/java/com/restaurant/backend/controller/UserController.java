package com.restaurant.backend.controller;

import com.restaurant.backend.dto.EmployeeDTO;
import com.restaurant.backend.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {

    @Autowired
    private EmployeeService employeeService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EmployeeDTO>> getAllUsers() {
        List<EmployeeDTO> customers = employeeService.getAllCustomers();
        return ResponseEntity.ok(customers);
    }

    @PatchMapping("/{id}/blacklist")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmployeeDTO> toggleBlacklist(
            @PathVariable Long id,
            @RequestParam boolean blacklisted) {
        EmployeeDTO updated = employeeService.setCustomerBlacklistStatus(id, blacklisted);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/blacklist")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmployeeDTO> updateBlacklist(
            @PathVariable Long id,
            @RequestParam boolean blacklisted) {
        EmployeeDTO updated = employeeService.setCustomerBlacklistStatus(id, blacklisted);
        return ResponseEntity.ok(updated);
    }
}

