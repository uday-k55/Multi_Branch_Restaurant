package com.restaurant.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "branches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Branch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "state", nullable = false)
    private String state;

    @Column(name = "district", nullable = false)
    private String district;

    @Column(name = "address")
    private String address;

    @Column(name = "phone")
    private String phone;

    // Latitude and longitude for delivery radius calculations
    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "opening_hours")
    private String openingHours;

    @Column(name = "closing_hours")
    private String closingHours;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
