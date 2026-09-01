package com.restaurant.backend.util;

import com.restaurant.backend.model.Branch;
import com.restaurant.backend.model.Role;
import com.restaurant.backend.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BranchSecurityUtils {

    @org.springframework.beans.factory.annotation.Autowired
    private com.restaurant.backend.repository.UserRepository userRepository;

    public User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be authenticated");
        }
        if (authentication.getPrincipal() instanceof User user) {
            return user;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be authenticated"));
    }

    public void validateBranchAccess(User currentUser, Long targetBranchId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be authenticated");
        }

        if (currentUser.getRole() == Role.ADMIN) {
            return; // ADMIN has full system-wide access across all branches
        }

        if (currentUser.getRole() == Role.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: Customers are not permitted to access administrative or staff endpoints");
        }

        if (targetBranchId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch ID is required");
        }

        Branch userBranch = currentUser.getBranch();
        if (userBranch == null || !targetBranchId.equals(userBranch.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                    "Access Denied: You are not authorized to access resources belonging to another branch");
        }
    }

    public void validateOrderAccess(User currentUser, Long orderUserId, Long orderBranchId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be authenticated");
        }

        if (currentUser.getRole() == Role.ADMIN) {
            return; // ADMIN can access any order
        }

        if (currentUser.getRole() == Role.CUSTOMER) {
            if (orderUserId == null || !currentUser.getId().equals(orderUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: You can only access your own orders");
            }
            return;
        }

        // For staff roles: BRANCH_MANAGER, CHEF, EMPLOYEE
        Branch userBranch = currentUser.getBranch();
        if (userBranch == null || orderBranchId == null || !orderBranchId.equals(userBranch.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                    "Access Denied: You are not authorized to access orders belonging to another branch");
        }
    }

    public void validateUserSelfOrAdmin(User currentUser, Long targetUserId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be authenticated");
        }

        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }

        if (targetUserId == null || !currentUser.getId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: You can only access your own user resources");
        }
    }
}
