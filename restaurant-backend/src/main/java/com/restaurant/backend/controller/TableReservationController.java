package com.restaurant.backend.controller;

import com.restaurant.backend.dto.ReservationDTO;
import com.restaurant.backend.dto.ReservationRequestDTO;
import com.restaurant.backend.dto.RestaurantTableDTO;
import com.restaurant.backend.model.Reservation;
import com.restaurant.backend.model.ReservationStatus;
import com.restaurant.backend.model.RestaurantTable;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.ReservationRepository;
import com.restaurant.backend.repository.RestaurantTableRepository;
import com.restaurant.backend.service.TableReservationService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api")
public class TableReservationController {

    @Autowired
    private TableReservationService tableReservationService;

    @Autowired
    private RestaurantTableRepository tableRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    // --- Table Management ---

    @PostMapping("/tables/branches/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<RestaurantTableDTO> addTable(
            Authentication authentication,
            @PathVariable Long branchId,
            @RequestBody RestaurantTableDTO dto) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        RestaurantTableDTO created = tableReservationService.addTable(branchId, dto);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/tables/{tableId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<RestaurantTableDTO> updateTable(
            Authentication authentication,
            @PathVariable Long tableId,
            @RequestBody RestaurantTableDTO dto) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, table.getBranch().getId());

        RestaurantTableDTO updated = tableReservationService.updateTable(tableId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/tables/{tableId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<Void> deleteTable(
            Authentication authentication,
            @PathVariable Long tableId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, table.getBranch().getId());

        tableReservationService.deleteTable(tableId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tables/branches/{branchId}")
    public ResponseEntity<List<RestaurantTableDTO>> getTablesByBranch(@PathVariable Long branchId) {
        List<RestaurantTableDTO> tables = tableReservationService.getTablesByBranch(branchId);
        return ResponseEntity.ok(tables);
    }

    @GetMapping("/tables/qr/{qrCode}")
    public ResponseEntity<RestaurantTableDTO> getTableByQrCode(@PathVariable String qrCode) {
        try {
            RestaurantTableDTO table = tableReservationService.getTableByQrCode(qrCode);
            return ResponseEntity.ok(table);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    // --- Reservation Flow ---

    @GetMapping("/reservations/available-tables")
    public ResponseEntity<List<RestaurantTableDTO>> findAvailableTables(
            @RequestParam Long branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime time,
            @RequestParam Integer numberOfPeople) {
        List<RestaurantTableDTO> tables = tableReservationService.findAvailableTables(branchId, date, time, numberOfPeople);
        return ResponseEntity.ok(tables);
    }

    @PostMapping("/reservations")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ReservationDTO> createReservation(@RequestBody ReservationRequestDTO dto) {
        ReservationDTO created = tableReservationService.createReservation(dto);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/reservations/branches/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<ReservationDTO>> getReservationsByBranch(
            Authentication authentication,
            @PathVariable Long branchId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        List<ReservationDTO> reservations = tableReservationService.getReservationsByBranch(branchId);
        return ResponseEntity.ok(reservations);
    }

    @PatchMapping("/reservations/{reservationId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ReservationDTO> updateReservationStatus(
            Authentication authentication,
            @PathVariable Long reservationId,
            @RequestParam ReservationStatus status) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        branchSecurityUtils.validateBranchAccess(currentUser, reservation.getBranch().getId());

        ReservationDTO updated = tableReservationService.updateReservationStatus(reservationId, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/reservations/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReservationDTO>> getMyReservations(Authentication authentication) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        List<ReservationDTO> list = tableReservationService.getCustomerReservations(currentUser.getEmail());
        return ResponseEntity.ok(list);
    }

    @PatchMapping("/reservations/{reservationId}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservationDTO> cancelMyReservation(
            Authentication authentication,
            @PathVariable Long reservationId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        ReservationDTO cancelled = tableReservationService.cancelReservationForCustomer(reservationId, currentUser.getEmail());
        return ResponseEntity.ok(cancelled);
    }
}
