package com.restaurant.backend.service;

import com.restaurant.backend.dto.CreateEmployeeRequestDTO;
import com.restaurant.backend.dto.EmployeeDTO;
import com.restaurant.backend.model.Branch;
import com.restaurant.backend.model.Role;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.BranchRepository;
import com.restaurant.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

@Service
@Transactional
public class EmployeeService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<EmployeeDTO> getAllEmployees(Long branchId, Role role) {
        List<User> users;
        List<Role> employeeRoles = List.of(Role.ADMIN, Role.BRANCH_MANAGER, Role.CHEF, Role.EMPLOYEE);

        if (branchId != null && role != null) {
            users = userRepository.findByBranchIdAndRoleIn(branchId, List.of(role));
        } else if (branchId != null) {
            users = userRepository.findByBranchIdAndRoleIn(branchId, employeeRoles);
        } else if (role != null) {
            users = userRepository.findByRole(role);
        } else {
            users = userRepository.findByRoleIn(employeeRoles);
        }

        return users.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public EmployeeDTO getEmployeeById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found with ID: " + id));
        return mapToDTO(user);
    }

    public EmployeeDTO createEmployee(CreateEmployeeRequestDTO request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee request body is required");
        }

        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }

        if (request.getLastName() == null || request.getLastName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Last name is required");
        }

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already in use");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        Role role = request.getRole();
        if (role == null || (!role.equals(Role.BRANCH_MANAGER) && !role.equals(Role.CHEF) && !role.equals(Role.EMPLOYEE))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid employee role. Allowed roles: BRANCH_MANAGER, CHEF, EMPLOYEE");
        }

        if (request.getBranchId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch ID is required for employee onboarding");
        }

        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid branch ID: Branch does not exist"));

        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setEmail(email);
        user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : "N/A");
        user.setGender(request.getGender() != null ? request.getGender().trim() : "unspecified");
        user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        user.setRole(role);
        user.setBranch(branch);

        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }

    public EmployeeDTO updateEmployee(Long id, CreateEmployeeRequestDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found with ID: " + id));

        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already in use");
            }
            user.setEmail(newEmail);
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender().trim());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }
        if (request.getRole() != null) {
            if (request.getRole().equals(Role.CUSTOMER)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set employee to CUSTOMER role");
            }
            user.setRole(request.getRole());
        }
        if (request.getBranchId() != null) {
            Branch branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid branch ID: Branch does not exist"));
            user.setBranch(branch);
        }

        User updated = userRepository.save(user);
        return mapToDTO(updated);
    }

    public List<EmployeeDTO> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public void deleteEmployee(Long id, String currentAdminEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + id));

        if (user.getEmail().equalsIgnoreCase(currentAdminEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete currently authenticated admin account");
        }

        try {
            userRepository.delete(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete user \"" + user.getEmail() + "\" because existing records (such as orders, reservations, or branch assignments) depend on this account."
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete user: " + e.getMessage());
        }
    }

    private EmployeeDTO mapToDTO(User user) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(user.getId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setGender(user.getGender());
        dto.setRole(user.getRole());
        if (user.getBranch() != null) {
            dto.setBranchId(user.getBranch().getId());
            dto.setBranchName(user.getBranch().getName());
        }
        return dto;
    }
}
