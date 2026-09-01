package com.restaurant.backend.service;

import com.restaurant.backend.dto.ReservationDTO;
import com.restaurant.backend.dto.ReservationRequestDTO;
import com.restaurant.backend.dto.RestaurantTableDTO;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.BranchRepository;
import com.restaurant.backend.repository.ReservationRepository;
import com.restaurant.backend.repository.RestaurantTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TableReservationService {

    @Autowired
    private RestaurantTableRepository tableRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private BranchRepository branchRepository;

    // --- Table Management ---

    public RestaurantTableDTO addTable(Long branchId, RestaurantTableDTO dto) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + branchId));

        RestaurantTable table = new RestaurantTable();
        table.setTableNumber(dto.getTableNumber());
        table.setCapacity(dto.getCapacity());
        table.setStatus(dto.getStatus() != null ? dto.getStatus() : TableStatus.AVAILABLE);
        table.setQrCode(dto.getQrCode() != null ? dto.getQrCode() : "QR-" + branchId + "-" + dto.getTableNumber());
        table.setBranch(branch);

        RestaurantTable saved = tableRepository.save(table);
        return mapTableToDTO(saved);
    }

    public RestaurantTableDTO updateTable(Long tableId, RestaurantTableDTO dto) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found with id: " + tableId));

        table.setTableNumber(dto.getTableNumber());
        table.setCapacity(dto.getCapacity());
        if (dto.getStatus() != null) {
            table.setStatus(dto.getStatus());
        }
        if (dto.getQrCode() != null) {
            table.setQrCode(dto.getQrCode());
        }

        RestaurantTable updated = tableRepository.save(table);
        return mapTableToDTO(updated);
    }

    public void deleteTable(Long tableId) {
        if (!tableRepository.existsById(tableId)) {
            throw new IllegalArgumentException("Table not found with id: " + tableId);
        }
        tableRepository.deleteById(tableId);
    }

    public List<RestaurantTableDTO> getTablesByBranch(Long branchId) {
        return tableRepository.findByBranchId(branchId).stream()
                .map(this::mapTableToDTO)
                .collect(Collectors.toList());
    }

    public RestaurantTableDTO getTableByQrCode(String qrCode) {
        RestaurantTable table = tableRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new IllegalArgumentException("Table not found for QR code: " + qrCode));
        return mapTableToDTO(table);
    }

    // --- Reservation Flow ---

    public List<RestaurantTableDTO> findAvailableTables(Long branchId, LocalDate date, LocalTime time, Integer numberOfPeople) {
        List<RestaurantTable> candidateTables = tableRepository.findByBranchIdAndCapacityGreaterThanEqual(branchId, numberOfPeople);

        return candidateTables.stream()
                .filter(table -> {
                    // Check if table has an active reservation at date & time
                    List<Reservation> existing = reservationRepository
                            .findByTableIdAndReservationDateAndReservationTimeAndStatusNot(
                                    table.getId(), date, time, ReservationStatus.CANCELLED);
                    return existing.isEmpty();
                })
                .map(this::mapTableToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReservationDTO createReservation(ReservationRequestDTO dto) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new IllegalArgumentException("Branch not found with id: " + dto.getBranchId()));

        RestaurantTable table = tableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new IllegalArgumentException("Table not found with id: " + dto.getTableId()));

        if (table.getCapacity() < dto.getNumberOfPeople()) {
            throw new IllegalArgumentException("Selected table capacity (" + table.getCapacity() +
                    ") is less than number of guests (" + dto.getNumberOfPeople() + ")");
        }

        // Prevent double booking
        List<Reservation> existing = reservationRepository
                .findByTableIdAndReservationDateAndReservationTimeAndStatusNot(
                        table.getId(), dto.getReservationDate(), dto.getReservationTime(), ReservationStatus.CANCELLED);

        if (!existing.isEmpty()) {
            throw new IllegalStateException("Table " + table.getTableNumber() + " is already reserved for " +
                    dto.getReservationDate() + " at " + dto.getReservationTime());
        }

        Reservation reservation = new Reservation();
        reservation.setCustomerName(dto.getCustomerName());
        reservation.setCustomerPhone(dto.getCustomerPhone());
        reservation.setCustomerEmail(dto.getCustomerEmail());
        reservation.setReservationDate(dto.getReservationDate());
        reservation.setReservationTime(dto.getReservationTime());
        reservation.setNumberOfPeople(dto.getNumberOfPeople());
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setTable(table);
        reservation.setBranch(branch);
        reservation.setCreatedAt(LocalDateTime.now());

        // Update table status if reservation is for today
        if (dto.getReservationDate().equals(LocalDate.now())) {
            table.setStatus(TableStatus.RESERVED);
            tableRepository.save(table);
        }

        Reservation saved = reservationRepository.save(reservation);
        return mapReservationToDTO(saved);
    }

    public List<ReservationDTO> getReservationsByBranch(Long branchId) {
        return reservationRepository.findByBranchId(branchId).stream()
                .map(this::mapReservationToDTO)
                .collect(Collectors.toList());
    }

    public List<ReservationDTO> getCustomerReservations(String email) {
        return reservationRepository.findByCustomerEmailOrderByCreatedAtDesc(email).stream()
                .map(this::mapReservationToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReservationDTO cancelReservationForCustomer(Long reservationId, String customerEmail) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with id: " + reservationId));

        if (reservation.getCustomerEmail() == null || !reservation.getCustomerEmail().equalsIgnoreCase(customerEmail)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Access Denied: You can only cancel your own reservations");
        }

        if (reservation.getStatus() == ReservationStatus.COMPLETED || reservation.getStatus() == ReservationStatus.SEATED) {
            throw new IllegalStateException("Cannot cancel reservation in status: " + reservation.getStatus());
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        Reservation updated = reservationRepository.save(reservation);
        return mapReservationToDTO(updated);
    }

    public ReservationDTO updateReservationStatus(Long reservationId, ReservationStatus status) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with id: " + reservationId));

        reservation.setStatus(status);
        Reservation updated = reservationRepository.save(reservation);
        return mapReservationToDTO(updated);
    }

    // --- Mappers ---

    private RestaurantTableDTO mapTableToDTO(RestaurantTable table) {
        return new RestaurantTableDTO(
                table.getId(),
                table.getTableNumber(),
                table.getCapacity(),
                table.getStatus(),
                table.getQrCode(),
                table.getBranch() != null ? table.getBranch().getId() : null
        );
    }

    private ReservationDTO mapReservationToDTO(Reservation r) {
        return new ReservationDTO(
                r.getId(),
                r.getCustomerName(),
                r.getCustomerPhone(),
                r.getCustomerEmail(),
                r.getReservationDate(),
                r.getReservationTime(),
                r.getNumberOfPeople(),
                r.getStatus(),
                r.getTable() != null ? r.getTable().getId() : null,
                r.getTable() != null ? r.getTable().getTableNumber() : null,
                r.getBranch() != null ? r.getBranch().getId() : null,
                r.getCreatedAt()
        );
    }
}
