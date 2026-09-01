package com.restaurant.backend.repository;

import com.restaurant.backend.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByBranchId(Long branchId);
    List<InventoryItem> findByCategoryId(Long categoryId);

    @Query("SELECT i FROM InventoryItem i WHERE i.branch.id = :branchId AND i.quantity <= i.lowStockThreshold")
    List<InventoryItem> findLowStockItemsByBranchId(@Param("branchId") Long branchId);
}
