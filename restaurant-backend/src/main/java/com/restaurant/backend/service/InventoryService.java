package com.restaurant.backend.service;

import com.restaurant.backend.dto.InventoryCategoryDTO;
import com.restaurant.backend.dto.InventoryItemDTO;
import com.restaurant.backend.dto.InventoryTransactionDTO;
import com.restaurant.backend.dto.StockAdjustmentDTO;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.BranchRepository;
import com.restaurant.backend.repository.InventoryCategoryRepository;
import com.restaurant.backend.repository.InventoryItemRepository;
import com.restaurant.backend.repository.InventoryTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    @Autowired
    private InventoryCategoryRepository categoryRepository;

    @Autowired
    private InventoryItemRepository itemRepository;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private BranchRepository branchRepository;

    // --- Category Management ---

    public InventoryCategoryDTO addCategory(Long branchId, InventoryCategoryDTO dto) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + branchId));

        InventoryCategory category = new InventoryCategory();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setBranch(branch);

        InventoryCategory saved = categoryRepository.save(category);
        return mapCategoryToDTO(saved);
    }

    public InventoryCategoryDTO updateCategory(Long categoryId, InventoryCategoryDTO dto) {
        InventoryCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Category not found with id: " + categoryId));

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());

        InventoryCategory updated = categoryRepository.save(category);
        return mapCategoryToDTO(updated);
    }

    public void deleteCategory(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new IllegalArgumentException("Inventory Category not found with id: " + categoryId);
        }
        categoryRepository.deleteById(categoryId);
    }

    public List<InventoryCategoryDTO> getCategoriesByBranch(Long branchId) {
        return categoryRepository.findByBranchId(branchId).stream()
                .map(this::mapCategoryToDTO)
                .collect(Collectors.toList());
    }

    // --- Item Management ---

    public InventoryItemDTO addItem(Long branchId, Long categoryId, InventoryItemDTO dto) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + branchId));

        InventoryCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Category not found with id: " + categoryId));

        InventoryItem item = new InventoryItem();
        item.setName(dto.getName());
        item.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 0.0);
        item.setUnit(dto.getUnit());
        item.setLowStockThreshold(dto.getLowStockThreshold() != null ? dto.getLowStockThreshold() : 5.0);
        item.setCategory(category);
        item.setBranch(branch);

        InventoryItem saved = itemRepository.save(item);
        return mapItemToDTO(saved);
    }

    public InventoryItemDTO updateItem(Long itemId, InventoryItemDTO dto) {
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found with id: " + itemId));

        item.setName(dto.getName());
        if (dto.getUnit() != null) {
            item.setUnit(dto.getUnit());
        }
        if (dto.getLowStockThreshold() != null) {
            item.setLowStockThreshold(dto.getLowStockThreshold());
        }

        if (dto.getCategoryId() != null) {
            InventoryCategory category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + dto.getCategoryId()));
            item.setCategory(category);
        }

        InventoryItem updated = itemRepository.save(item);
        return mapItemToDTO(updated);
    }

    public void deleteItem(Long itemId) {
        if (!itemRepository.existsById(itemId)) {
            throw new IllegalArgumentException("Inventory Item not found with id: " + itemId);
        }
        itemRepository.deleteById(itemId);
    }

    public List<InventoryItemDTO> getItemsByBranch(Long branchId) {
        return itemRepository.findByBranchId(branchId).stream()
                .map(this::mapItemToDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getLowStockItemsByBranch(Long branchId) {
        return itemRepository.findLowStockItemsByBranchId(branchId).stream()
                .map(this::mapItemToDTO)
                .collect(Collectors.toList());
    }

    // --- Stock Movement (Stock-In, Stock-Out, Usage Tracking) ---

    @Transactional
    public InventoryItemDTO adjustStock(Long itemId, StockAdjustmentDTO adjustmentDTO) {
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found with id: " + itemId));

        double change = adjustmentDTO.getQuantity() != null ? adjustmentDTO.getQuantity() : 0.0;
        TransactionType type = adjustmentDTO.getTransactionType() != null ? adjustmentDTO.getTransactionType() : TransactionType.STOCK_IN;

        if (type == TransactionType.STOCK_OUT || type == TransactionType.USAGE) {
            if (item.getQuantity() < change) {
                throw new IllegalArgumentException("Insufficient stock for item: " + item.getName() +
                        ". Available: " + item.getQuantity() + ", Requested: " + change);
            }
            change = -change; // reduction
        }

        double newQuantity = item.getQuantity() + change;
        item.setQuantity(newQuantity);
        InventoryItem updatedItem = itemRepository.save(item);

        // Record Transaction
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setInventoryItem(updatedItem);
        transaction.setTransactionType(type);
        transaction.setQuantityChange(change);
        transaction.setResultingQuantity(newQuantity);
        String transactionNotes = adjustmentDTO.getNotes() != null ? adjustmentDTO.getNotes() : adjustmentDTO.getReason();
        transaction.setNotes(transactionNotes);
        transaction.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        return mapItemToDTO(updatedItem);
    }

    public List<InventoryTransactionDTO> getBranchTransactions(Long branchId) {
        return transactionRepository.findByInventoryItemBranchIdOrderByCreatedAtDesc(branchId).stream()
                .map(this::mapTransactionToDTO)
                .collect(Collectors.toList());
    }

    // --- Helper Mappers ---

    private InventoryCategoryDTO mapCategoryToDTO(InventoryCategory category) {
        return new InventoryCategoryDTO(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getBranch() != null ? category.getBranch().getId() : null
        );
    }

    private InventoryItemDTO mapItemToDTO(InventoryItem item) {
        boolean isLowStock = item.getQuantity() <= item.getLowStockThreshold();
        return new InventoryItemDTO(
                item.getId(),
                item.getName(),
                item.getQuantity(),
                item.getUnit(),
                item.getLowStockThreshold(),
                isLowStock,
                item.getCategory() != null ? item.getCategory().getId() : null,
                item.getCategory() != null ? item.getCategory().getName() : null,
                item.getBranch() != null ? item.getBranch().getId() : null
        );
    }

    private InventoryTransactionDTO mapTransactionToDTO(InventoryTransaction t) {
        return new InventoryTransactionDTO(
                t.getId(),
                t.getInventoryItem() != null ? t.getInventoryItem().getId() : null,
                t.getInventoryItem() != null ? t.getInventoryItem().getName() : null,
                t.getTransactionType(),
                t.getQuantityChange(),
                t.getResultingQuantity(),
                t.getNotes(),
                t.getCreatedAt()
        );
    }
}
