package com.restaurant.backend.service;

import com.restaurant.backend.dto.FoodItemDTO;
import com.restaurant.backend.dto.MenuCategoryDTO;
import com.restaurant.backend.model.Branch;
import com.restaurant.backend.model.FoodItem;
import com.restaurant.backend.model.MenuCategory;
import com.restaurant.backend.repository.BranchRepository;
import com.restaurant.backend.repository.FoodItemRepository;
import com.restaurant.backend.repository.MenuCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MenuService {

    @Autowired
    private MenuCategoryRepository categoryRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Autowired
    private BranchRepository branchRepository;

    // --- Category Management ---

    public MenuCategoryDTO addCategory(Long branchId, MenuCategoryDTO dto) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + branchId));

        MenuCategory category = new MenuCategory();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setBranch(branch);

        MenuCategory saved = categoryRepository.save(category);
        return mapCategoryToDTO(saved);
    }

    public MenuCategoryDTO updateCategory(Long categoryId, MenuCategoryDTO dto) {
        MenuCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + categoryId));

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());

        MenuCategory updated = categoryRepository.save(category);
        return mapCategoryToDTO(updated);
    }

    public void deleteCategory(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new IllegalArgumentException("Category not found with id: " + categoryId);
        }
        categoryRepository.deleteById(categoryId);
    }

    public List<MenuCategoryDTO> getCategoriesByBranch(Long branchId) {
        return categoryRepository.findByBranchId(branchId).stream()
                .map(this::mapCategoryToDTO)
                .collect(Collectors.toList());
    }

    // --- Food Item Management ---

    public FoodItemDTO addFoodItem(Long branchId, Long categoryId, FoodItemDTO dto) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + branchId));

        MenuCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + categoryId));

        FoodItem item = new FoodItem();
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setImageUrl(dto.getImageUrl());
        item.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : true);
        item.setSeasonal(dto.getIsSeasonal() != null ? dto.getIsSeasonal() : false);
        item.setCategory(category);
        item.setBranch(branch);

        FoodItem saved = foodItemRepository.save(item);
        return mapFoodItemToDTO(saved);
    }

    public FoodItemDTO updateFoodItem(Long itemId, FoodItemDTO dto) {
        FoodItem item = foodItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Food item not found with id: " + itemId));

        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setImageUrl(dto.getImageUrl());
        item.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : true);
        item.setSeasonal(dto.getIsSeasonal() != null ? dto.getIsSeasonal() : false);

        if (dto.getCategoryId() != null) {
            MenuCategory category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + dto.getCategoryId()));
            item.setCategory(category);
        }

        FoodItem updated = foodItemRepository.save(item);
        return mapFoodItemToDTO(updated);
    }

    public void deleteFoodItem(Long itemId) {
        if (!foodItemRepository.existsById(itemId)) {
            throw new IllegalArgumentException("Food item not found with id: " + itemId);
        }
        foodItemRepository.deleteById(itemId);
    }

    public List<FoodItemDTO> getFoodItemsByBranch(Long branchId) {
        return foodItemRepository.findByBranchId(branchId).stream()
                .map(this::mapFoodItemToDTO)
                .collect(Collectors.toList());
    }

    public List<FoodItemDTO> getCustomerMenuByBranch(Long branchId) {
        return foodItemRepository.findByBranchIdAndEnabledTrue(branchId).stream()
                .map(this::mapFoodItemToDTO)
                .collect(Collectors.toList());
    }

    // --- Helper Mappers ---

    private MenuCategoryDTO mapCategoryToDTO(MenuCategory category) {
        return new MenuCategoryDTO(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getBranch() != null ? category.getBranch().getId() : null
        );
    }

    private FoodItemDTO mapFoodItemToDTO(FoodItem item) {
        return new FoodItemDTO(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getImageUrl(),
                item.isEnabled(),
                item.isSeasonal(),
                item.getCategory() != null ? item.getCategory().getId() : null,
                item.getCategory() != null ? item.getCategory().getName() : null,
                item.getBranch() != null ? item.getBranch().getId() : null
        );
    }
}
