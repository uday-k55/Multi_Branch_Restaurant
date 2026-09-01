package com.restaurant.backend.repository;

import com.restaurant.backend.model.InventoryCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryCategoryRepository extends JpaRepository<InventoryCategory, Long> {
    List<InventoryCategory> findByBranchId(Long branchId);
}
