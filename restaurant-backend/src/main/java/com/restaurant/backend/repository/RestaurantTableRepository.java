package com.restaurant.backend.repository;

import com.restaurant.backend.model.RestaurantTable;
import com.restaurant.backend.model.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    List<RestaurantTable> findByBranchId(Long branchId);
    List<RestaurantTable> findByBranchIdAndStatus(Long branchId, TableStatus status);
    List<RestaurantTable> findByBranchIdAndCapacityGreaterThanEqual(Long branchId, Integer capacity);
    Optional<RestaurantTable> findByQrCode(String qrCode);
}
