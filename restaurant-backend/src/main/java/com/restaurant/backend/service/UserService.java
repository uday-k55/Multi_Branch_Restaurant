package com.restaurant.backend.service;

import com.restaurant.backend.dto.RegisterRequest;
import com.restaurant.backend.model.User;

public interface UserService {
    User registerUser(RegisterRequest registerRequest);
    boolean existsByEmail(String email);
}
