package com.restaurant.backend.repository;

import com.restaurant.backend.model.Order;
import com.restaurant.backend.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    long countByStatusIn(List<OrderStatus> statuses);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.branch.id = :branchId AND o.status IN :statuses")
    long countByBranchIdAndStatusIn(@Param("branchId") Long branchId, @Param("statuses") List<OrderStatus> statuses);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByBranchIdOrderByCreatedAtDesc(Long branchId);

    List<Order> findByBranchIdAndStatusInOrderByCreatedAtDesc(Long branchId, List<OrderStatus> statuses);

    List<Order> findByAssignedEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @Query(value = "SELECT * FROM orders WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    Optional<Order> findByIdAndUserId(Long id, Long userId);
}
