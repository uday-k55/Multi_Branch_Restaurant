package com.restaurant.backend.service;

import com.restaurant.backend.dto.DeliveryValidationRequest;
import com.restaurant.backend.dto.DeliveryValidationResponse;
import com.restaurant.backend.model.Branch;
import com.restaurant.backend.repository.BranchRepository;
import com.restaurant.backend.util.GeoUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DeliveryService {
    private static final double MAX_RADIUS_KM = 10.0;

    @Autowired
    private BranchRepository branchRepository;

    /**
     * Validates whether the given customer coordinates are within the allowed delivery radius of the branch.
     *
     * @param branchId the ID of the branch to check against
     * @param request  contains customer latitude and longitude
     * @return a response indicating if delivery is allowed and a message
     */
    public DeliveryValidationResponse validateDeliveryRadius(Long branchId, DeliveryValidationRequest request) {
        Branch branch = branchRepository.findById(branchId).orElse(null);
        if (branch == null) {
            return new DeliveryValidationResponse(false, "Branch not found", null);
        }
        double distance = GeoUtils.haversine(
                branch.getLatitude(), branch.getLongitude(),
                request.getLatitude(), request.getLongitude());
        boolean allowed = distance <= MAX_RADIUS_KM;
        String message = allowed ? "Delivery available within " + String.format("%.2f", distance) + " km"
                : "Delivery unavailable – distance " + String.format("%.2f", distance) + " km exceeds limit of " + MAX_RADIUS_KM + " km";
        return new DeliveryValidationResponse(allowed, message, distance);
    }
}
