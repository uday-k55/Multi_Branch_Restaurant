package com.restaurant.backend.controller;

import com.restaurant.backend.dto.FoodItemDTO;
import com.restaurant.backend.dto.MenuCategoryDTO;
import com.restaurant.backend.model.FoodItem;
import com.restaurant.backend.model.MenuCategory;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.FoodItemRepository;
import com.restaurant.backend.repository.MenuCategoryRepository;
import com.restaurant.backend.service.MenuService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuController {

    @Autowired
    private MenuService menuService;

    @Autowired
    private MenuCategoryRepository categoryRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    // --- Category Endpoints ---

    @PostMapping("/branches/{branchId}/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MenuCategoryDTO> addCategory(
            Authentication authentication,
            @PathVariable Long branchId,
            @RequestBody MenuCategoryDTO categoryDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        MenuCategoryDTO created = menuService.addCategory(branchId, categoryDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/categories/{categoryId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MenuCategoryDTO> updateCategory(
            Authentication authentication,
            @PathVariable Long categoryId,
            @RequestBody MenuCategoryDTO categoryDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        MenuCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, category.getBranch().getId());

        MenuCategoryDTO updated = menuService.updateCategory(categoryId, categoryDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/categories/{categoryId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCategory(
            Authentication authentication,
            @PathVariable Long categoryId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        MenuCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, category.getBranch().getId());

        menuService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/branches/{branchId}/categories")
    public ResponseEntity<List<MenuCategoryDTO>> getCategoriesByBranch(@PathVariable Long branchId) {
        List<MenuCategoryDTO> categories = menuService.getCategoriesByBranch(branchId);
        return ResponseEntity.ok(categories);
    }

    // --- Food Item Endpoints ---

    @PostMapping("/branches/{branchId}/categories/{categoryId}/items")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FoodItemDTO> addFoodItem(
            Authentication authentication,
            @PathVariable Long branchId,
            @PathVariable Long categoryId,
            @RequestBody FoodItemDTO foodItemDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        FoodItemDTO created = menuService.addFoodItem(branchId, categoryId, foodItemDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FoodItemDTO> updateFoodItem(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody FoodItemDTO foodItemDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        FoodItem item = foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food item not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, item.getBranch().getId());

        FoodItemDTO updated = menuService.updateFoodItem(itemId, foodItemDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFoodItem(
            Authentication authentication,
            @PathVariable Long itemId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        FoodItem item = foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food item not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, item.getBranch().getId());

        menuService.deleteFoodItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/branches/{branchId}/items")
    public ResponseEntity<List<FoodItemDTO>> getFoodItemsByBranch(@PathVariable Long branchId) {
        List<FoodItemDTO> items = menuService.getFoodItemsByBranch(branchId);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/branches/{branchId}/customer-menu")
    public ResponseEntity<List<FoodItemDTO>> getCustomerMenuByBranch(@PathVariable Long branchId) {
        List<FoodItemDTO> items = menuService.getCustomerMenuByBranch(branchId);
        return ResponseEntity.ok(items);
    }
}
