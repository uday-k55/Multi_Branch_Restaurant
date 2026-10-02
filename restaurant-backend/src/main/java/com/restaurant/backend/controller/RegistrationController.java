package com.restaurant.backend.controller;

import com.restaurant.backend.dto.RegisterRequest;
import com.restaurant.backend.model.User;
import com.restaurant.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"https://whimsical-sopapillas-78c574.netlify.app", "http://localhost:4200"})
public class RegistrationController {

    private final UserService userService;

    public RegistrationController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        if (userService.existsByEmail(registerRequest.getEmail())) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Email is already in use!");
            return ResponseEntity.badRequest().body(response);
        }

        User registeredUser = userService.registerUser(registerRequest);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully!");
        response.put("userId", registeredUser.getId());
        return ResponseEntity.ok(response);
    }
}
