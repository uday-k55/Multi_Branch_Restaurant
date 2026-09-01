package com.restaurant.backend.controller;

import com.restaurant.backend.dto.PaymentProcessDTO;
import com.restaurant.backend.dto.PaymentRequestDTO;
import com.restaurant.backend.dto.PaymentResponseDTO;
import com.restaurant.backend.model.Payment;
import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.PaymentRepository;
import com.restaurant.backend.service.PaymentService;
import com.restaurant.backend.util.BranchSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BranchSecurityUtils branchSecurityUtils;

    @PostMapping("/initiate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponseDTO> initiatePayment(
            Authentication authentication,
            @RequestBody PaymentRequestDTO dto) {
        PaymentResponseDTO response = paymentService.initiatePayment(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{paymentId}/process")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponseDTO> processDemoPayment(
            Authentication authentication,
            @PathVariable Long paymentId,
            @RequestBody PaymentProcessDTO dto) {
        PaymentResponseDTO response = paymentService.processDemoPayment(paymentId, dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{paymentId}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER')")
    public ResponseEntity<PaymentResponseDTO> refundPayment(
            Authentication authentication,
            @PathVariable Long paymentId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment record not found"));

        Long branchId = payment.getOrder() != null && payment.getOrder().getBranch() != null 
                ? payment.getOrder().getBranch().getId() : null;
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);

        PaymentResponseDTO response = paymentService.refundPayment(paymentId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponseDTO> getPaymentByOrder(
            Authentication authentication,
            @PathVariable Long orderId) {
        User currentUser = branchSecurityUtils.getAuthenticatedUser(authentication);
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found for order ID: " + orderId));

        Long orderUserId = payment.getOrder() != null && payment.getOrder().getUser() != null 
                ? payment.getOrder().getUser().getId() : null;
        Long orderBranchId = payment.getOrder() != null && payment.getOrder().getBranch() != null 
                ? payment.getOrder().getBranch().getId() : null;

        branchSecurityUtils.validateOrderAccess(currentUser, orderUserId, orderBranchId);

        PaymentResponseDTO response = paymentService.getPaymentByOrder(orderId);
        return ResponseEntity.ok(response);
    }
}
