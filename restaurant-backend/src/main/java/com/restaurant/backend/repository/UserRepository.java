package com.restaurant.backend.repository;

import com.restaurant.backend.model.Role;
import com.restaurant.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRoleIn(List<Role> roles);
    long countByBranchIdAndRoleIn(Long branchId, List<Role> roles);
    List<User> findByRoleIn(List<Role> roles);
    List<User> findByBranchId(Long branchId);
    List<User> findByBranchIdAndRoleIn(Long branchId, List<Role> roles);
    List<User> findByRole(Role role);
}
