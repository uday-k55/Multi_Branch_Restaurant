package com.restaurant.backend.controller;

import com.restaurant.backend.dto.AuthRequest;
import com.restaurant.backend.dto.AuthResponse;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.UserRepository;
import com.restaurant.backend.util.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password"));
        }

        if (Boolean.TRUE.equals(user.getBlacklisted())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Your account has been blacklisted. Please contact the restaurant administrator."));
        }

        String token = jwtUtils.generateToken(user);
        Long branchId = user.getBranch() != null ? user.getBranch().getId() : null;

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getRole(),
                branchId
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.restaurant.backend.dto.UserProfileDTO> getProfile(org.springframework.security.core.Authentication authentication) {
        User user = extractUser(authentication);

        com.restaurant.backend.dto.UserProfileDTO dto = new com.restaurant.backend.dto.UserProfileDTO(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getGender(),
                user.getRole(),
                user.getBranch() != null ? user.getBranch().getId() : null,
                user.getBranch() != null ? user.getBranch().getName() : null
        );
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.restaurant.backend.dto.UserProfileDTO> updateProfile(
            org.springframework.security.core.Authentication authentication,
            @RequestBody com.restaurant.backend.dto.UserProfileDTO profileDTO) {
        User user = extractUser(authentication);

        if (profileDTO.getFirstName() != null && !profileDTO.getFirstName().isBlank()) {
            user.setFirstName(profileDTO.getFirstName());
        }
        if (profileDTO.getLastName() != null && !profileDTO.getLastName().isBlank()) {
            user.setLastName(profileDTO.getLastName());
        }
        if (profileDTO.getPhoneNumber() != null && !profileDTO.getPhoneNumber().isBlank()) {
            user.setPhoneNumber(profileDTO.getPhoneNumber());
        }
        if (profileDTO.getGender() != null && !profileDTO.getGender().isBlank()) {
            user.setGender(profileDTO.getGender());
        }

        User saved = userRepository.save(user);

        com.restaurant.backend.dto.UserProfileDTO dto = new com.restaurant.backend.dto.UserProfileDTO(
                saved.getId(),
                saved.getFirstName(),
                saved.getLastName(),
                saved.getEmail(),
                saved.getPhoneNumber(),
                saved.getGender(),
                saved.getRole(),
                saved.getBranch() != null ? saved.getBranch().getId() : null,
                saved.getBranch() != null ? saved.getBranch().getName() : null
        );
        return ResponseEntity.ok(dto);
    }

    private User extractUser(org.springframework.security.core.Authentication authentication) {
        if (authentication == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (authentication.getPrincipal() instanceof User user) {
            return user;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}

