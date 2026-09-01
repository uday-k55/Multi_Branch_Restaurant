package com.restaurant.backend.controller;

import com.restaurant.backend.model.Branch;
import com.restaurant.backend.service.BranchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    @Autowired
    private BranchService branchService;

    @GetMapping
    public ResponseEntity<List<Branch>> getAllBranches(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) Boolean activeOnly) {
        List<Branch> branches = branchService.getAllBranches(state, district, activeOnly);
        return ResponseEntity.ok(branches);
    }

    @GetMapping("/states")
    public ResponseEntity<List<String>> getStates() {
        return ResponseEntity.ok(branchService.getStates());
    }

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts(@RequestParam String state) {
        return ResponseEntity.ok(branchService.getDistricts(state));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> getBranchById(@PathVariable Long id) {
        Branch branch = branchService.getBranchById(id);
        return ResponseEntity.ok(branch);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> createBranch(@RequestBody Branch branch) {
        Branch created = branchService.createBranch(branch);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> updateBranch(@PathVariable Long id, @RequestBody Branch branch) {
        Branch updated = branchService.updateBranch(id, branch);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> setBranchActiveStatus(@PathVariable Long id, @RequestParam boolean active) {
        Branch updated = branchService.setBranchActiveStatus(id, active);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }
}
