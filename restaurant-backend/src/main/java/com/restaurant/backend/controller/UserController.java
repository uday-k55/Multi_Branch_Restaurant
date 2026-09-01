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
        List<EmployeeDTO> users = employeeService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            Authentication authentication) {
        String currentAdminEmail = authentication != null ? authentication.getName() : "";
        employeeService.deleteEmployee(id, currentAdminEmail);
        return ResponseEntity.noContent().build();
    }
}
