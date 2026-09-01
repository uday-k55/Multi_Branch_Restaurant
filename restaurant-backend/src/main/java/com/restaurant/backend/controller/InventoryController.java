package com.restaurant.backend.controller;

import com.restaurant.backend.dto.InventoryCategoryDTO;
import com.restaurant.backend.dto.InventoryItemDTO;
import com.restaurant.backend.dto.InventoryTransactionDTO;
import com.restaurant.backend.dto.StockAdjustmentDTO;
import com.restaurant.backend.model.InventoryCategory;
import com.restaurant.backend.model.InventoryItem;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.InventoryCategoryRepository;
import com.restaurant.backend.repository.InventoryItemRepository;
import com.restaurant.backend.service.InventoryService;
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
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private InventoryCategoryRepository categoryRepository;

    @Autowired
    private InventoryItemRepository itemRepository;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    // --- Category Endpoints ---

    @PostMapping("/branches/{branchId}/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<InventoryCategoryDTO> addCategory(
            Authentication authentication,
            @PathVariable Long branchId,
            @RequestBody InventoryCategoryDTO categoryDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        InventoryCategoryDTO created = inventoryService.addCategory(branchId, categoryDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/categories/{categoryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<InventoryCategoryDTO> updateCategory(
            Authentication authentication,
            @PathVariable Long categoryId,
            @RequestBody InventoryCategoryDTO categoryDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        InventoryCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory category not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, category.getBranch().getId());

        InventoryCategoryDTO updated = inventoryService.updateCategory(categoryId, categoryDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/categories/{categoryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<Void> deleteCategory(
            Authentication authentication,
            @PathVariable Long categoryId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        InventoryCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory category not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, category.getBranch().getId());

        inventoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/branches/{branchId}/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<InventoryCategoryDTO>> getCategoriesByBranch(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<InventoryCategoryDTO> categories = inventoryService.getCategoriesByBranch(branchId);
        return ResponseEntity.ok(categories);
    }

    // --- Inventory Item Endpoints ---

    @PostMapping("/branches/{branchId}/categories/{categoryId}/items")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<InventoryItemDTO> addItem(
            Authentication authentication,
            @PathVariable Long branchId,
            @PathVariable Long categoryId,
            @RequestBody InventoryItemDTO itemDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        InventoryItemDTO created = inventoryService.addItem(branchId, categoryId, itemDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<InventoryItemDTO> updateItem(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody InventoryItemDTO itemDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, item.getBranch().getId());

        InventoryItemDTO updated = inventoryService.updateItem(itemId, itemDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<Void> deleteItem(
            Authentication authentication,
            @PathVariable Long itemId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, item.getBranch().getId());

        inventoryService.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/branches/{branchId}/items")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<InventoryItemDTO>> getItemsByBranch(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<InventoryItemDTO> items = inventoryService.getItemsByBranch(branchId);
        return ResponseEntity.ok(items);
    }

    // --- Low Stock Alerts ---

    @GetMapping("/branches/{branchId}/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<InventoryItemDTO>> getLowStockItems(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<InventoryItemDTO> lowStockItems = inventoryService.getLowStockItemsByBranch(branchId);
        return ResponseEntity.ok(lowStockItems);
    }

    // --- Stock-in / Stock-out / Usage Tracking ---

    @PostMapping("/items/{itemId}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<InventoryItemDTO> adjustStock(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody StockAdjustmentDTO adjustmentDTO) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, item.getBranch().getId());

        InventoryItemDTO updated = inventoryService.adjustStock(itemId, adjustmentDTO);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/branches/{branchId}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<List<InventoryTransactionDTO>> getBranchTransactions(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<InventoryTransactionDTO> transactions = inventoryService.getBranchTransactions(branchId);
        return ResponseEntity.ok(transactions);
    }
}
