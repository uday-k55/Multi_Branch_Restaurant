package com.restaurant.backend.model;

public enum PasswordResetStatus {
    PENDING,
    VERIFIED,
    USED,
    EXPIRED,
    EXHAUSTED,
    FAILED
}
