package com.restaurant.backend.dto;

public class DeliveryValidationResponse {
    private boolean allowed;
    private String message;
    private Double distanceKm;

    public DeliveryValidationResponse() {}

    public DeliveryValidationResponse(boolean allowed, String message, Double distanceKm) {
        this.allowed = allowed;
        this.message = message;
        this.distanceKm = distanceKm;
    }

    public boolean isAllowed() {
        return allowed;
    }

    public void setAllowed(boolean allowed) {
        this.allowed = allowed;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(Double distanceKm) {
        this.distanceKm = distanceKm;
    }
}
