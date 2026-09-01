package com.restaurant.backend.repository;

import com.restaurant.backend.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByInventoryItemIdOrderByCreatedAtDesc(Long inventoryItemId);
    List<InventoryTransaction> findByInventoryItemBranchIdOrderByCreatedAtDesc(Long branchId);
}
