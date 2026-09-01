package com.restaurant.backend.dto;

import com.restaurant.backend.model.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDTO {
    private Long id;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private LocalDate reservationDate;
    private LocalTime reservationTime;
    private Integer numberOfPeople;
    private ReservationStatus status;
    private Long tableId;
    private String tableNumber;
    private Long branchId;
    private LocalDateTime createdAt;
}
