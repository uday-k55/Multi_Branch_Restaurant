package com.restaurant.backend.service;

import com.restaurant.backend.model.Branch;
import com.restaurant.backend.repository.BranchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BranchService {

    @Autowired
    private BranchRepository branchRepository;

    public List<Branch> getAllBranches(String state, String district, Boolean activeOnly) {
        boolean onlyActive = Boolean.TRUE.equals(activeOnly);
        boolean hasState = state != null && !state.trim().isEmpty();
        boolean hasDistrict = district != null && !district.trim().isEmpty();

        if (hasState && hasDistrict) {
            return onlyActive 
                ? branchRepository.findByStateAndDistrictAndActiveTrue(state.trim(), district.trim())
                : branchRepository.findByStateAndDistrict(state.trim(), district.trim());
        }
        if (hasState) {
            return onlyActive 
                ? branchRepository.findByStateAndActiveTrue(state.trim())
                : branchRepository.findByState(state.trim());
        }
        if (onlyActive) {
            return branchRepository.findByActiveTrue();
        }
        return branchRepository.findAll();
    }

    public Branch getBranchById(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found with ID: " + id));
    }

    public List<String> getStates() {
        return branchRepository.findDistinctStates();
    }

    public List<String> getDistricts(String state) {
        if (state == null || state.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State parameter is required");
        }
        return branchRepository.findDistinctDistrictsByState(state.trim());
    }

    public Branch createBranch(Branch branch) {
        if (branch.getName() == null || branch.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch name is required");
        }
        if (branch.getState() == null || branch.getState().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State is required");
        }
        if (branch.getDistrict() == null || branch.getDistrict().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "District is required");
        }
        if (branch.getLatitude() == null || branch.getLongitude() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Latitude and Longitude are required");
        }
        return branchRepository.save(branch);
    }

    public Branch updateBranch(Long id, Branch updated) {
        Branch existing = getBranchById(id);
        if (updated.getName() != null && !updated.getName().trim().isEmpty()) {
            existing.setName(updated.getName().trim());
        }
        if (updated.getState() != null && !updated.getState().trim().isEmpty()) {
            existing.setState(updated.getState().trim());
        }
        if (updated.getDistrict() != null && !updated.getDistrict().trim().isEmpty()) {
            existing.setDistrict(updated.getDistrict().trim());
        }
        if (updated.getAddress() != null) {
            existing.setAddress(updated.getAddress());
        }
        if (updated.getPhone() != null) {
            existing.setPhone(updated.getPhone());
        }
        if (updated.getLatitude() != null) {
            existing.setLatitude(updated.getLatitude());
        }
        if (updated.getLongitude() != null) {
            existing.setLongitude(updated.getLongitude());
        }
        if (updated.getOpeningHours() != null) {
            existing.setOpeningHours(updated.getOpeningHours());
        }
        if (updated.getClosingHours() != null) {
            existing.setClosingHours(updated.getClosingHours());
        }
        existing.setActive(updated.isActive());
        return branchRepository.save(existing);
    }

    public Branch setBranchActiveStatus(Long id, boolean active) {
        Branch existing = getBranchById(id);
        existing.setActive(active);
        return branchRepository.save(existing);
    }

    public void deleteBranch(Long id) {
        Branch existing = getBranchById(id);
        branchRepository.delete(existing);
    }
}
