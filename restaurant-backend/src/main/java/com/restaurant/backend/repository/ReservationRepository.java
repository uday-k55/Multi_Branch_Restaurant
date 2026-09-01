package com.restaurant.backend.repository;

import com.restaurant.backend.model.Reservation;
import com.restaurant.backend.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByBranchId(Long branchId);
    List<Reservation> findByBranchIdAndReservationDate(Long branchId, LocalDate reservationDate);
    List<Reservation> findByTableIdAndReservationDateAndReservationTimeAndStatusNot(
            Long tableId, LocalDate date, LocalTime time, ReservationStatus status);
    List<Reservation> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail);
}
