package com.restaurant.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequestDTO {
    private Long branchId;
    private Long tableId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private LocalDate reservationDate;
    private LocalTime reservationTime;
    private Integer numberOfPeople;
}
