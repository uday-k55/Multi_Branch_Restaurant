package com.restaurant.backend.repository;

import com.restaurant.backend.model.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    List<FoodItem> findByBranchId(Long branchId);
    List<FoodItem> findByCategoryId(Long categoryId);
    List<FoodItem> findByBranchIdAndEnabledTrue(Long branchId);
}
