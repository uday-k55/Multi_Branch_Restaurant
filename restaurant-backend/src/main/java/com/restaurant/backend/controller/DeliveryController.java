package com.restaurant.backend.controller;

import com.restaurant.backend.dto.DeliveryValidationRequest;
import com.restaurant.backend.dto.DeliveryValidationResponse;
import com.restaurant.backend.service.DeliveryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for validating home‑delivery radius.
 *
 * Endpoint: POST /api/delivery/validate/{branchId}
 * Payload: { "latitude": <customerLat>, "longitude": <customerLon> }
 *
 * Returns a JSON response indicating whether delivery is allowed and a clear message.
 */
@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    @Autowired
    private DeliveryService deliveryService;

    @PostMapping("/validate/{branchId}")
    public ResponseEntity<DeliveryValidationResponse> validateDeliveryRadius(
            @PathVariable Long branchId,
            @RequestBody DeliveryValidationRequest request) {
        DeliveryValidationResponse response = deliveryService.validateDeliveryRadius(branchId, request);
        return ResponseEntity.ok(response);
    }
}
