package com.restaurant.backend.service;

import com.restaurant.backend.dto.NotificationDTO;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.NotificationRepository;
import com.restaurant.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private OrderRepository orderRepository;

    // --- System Event Triggers ---

    /**
     * Triggered when a new order is PLACED.
     * Chef: "New order available"
     */
    @Transactional
    public void handleNewOrderEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        Notification notification = new Notification();
        notification.setRecipientRole(Role.CHEF);
        notification.setBranch(order.getBranch());
        notification.setOrderId(order.getId());
        notification.setNotificationType(NotificationType.CHEF_NEW_ORDER);
        notification.setMessage("New order available");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
    }

    /**
     * Triggered when an order status changes to READY.
     * Generates appropriate notifications based on order type:
     * - Employee: "Order is ready for pickup" (for TAKEAWAY)
     * - Employee: "New delivery available" (for DELIVERY)
     * - Customer: "Your order is ready"
     */
    @Transactional
    public void handleOrderReadyEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        // Customer notification
        Notification customerNotif = new Notification();
        customerNotif.setRecipientRole(Role.CUSTOMER);
        customerNotif.setBranch(order.getBranch());
        customerNotif.setOrderId(order.getId());
        customerNotif.setNotificationType(NotificationType.CUSTOMER_ORDER_READY);
        customerNotif.setMessage("Your order is ready");
        customerNotif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(customerNotif);

        // Employee notification depending on OrderType
        if (order.getOrderType() == OrderType.TAKEAWAY) {
            Notification employeeNotif = new Notification();
            employeeNotif.setRecipientRole(Role.EMPLOYEE);
            employeeNotif.setBranch(order.getBranch());
            employeeNotif.setOrderId(order.getId());
            employeeNotif.setNotificationType(NotificationType.EMPLOYEE_PICKUP_READY);
            employeeNotif.setMessage("Order is ready for pickup");
            employeeNotif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(employeeNotif);
        } else if (order.getOrderType() == OrderType.DELIVERY) {
            Notification employeeNotif = new Notification();
            employeeNotif.setRecipientRole(Role.EMPLOYEE);
            employeeNotif.setBranch(order.getBranch());
            employeeNotif.setOrderId(order.getId());
            employeeNotif.setNotificationType(NotificationType.EMPLOYEE_NEW_DELIVERY);
            employeeNotif.setMessage("New delivery available");
            employeeNotif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(employeeNotif);
        } else if (order.getOrderType() == OrderType.DINE_IN) {
            String tableNum = order.getTable() != null ? order.getTable().getTableNumber() : "N/A";
            Notification employeeNotif = new Notification();
            employeeNotif.setRecipientRole(Role.EMPLOYEE);
            employeeNotif.setBranch(order.getBranch());
            employeeNotif.setOrderId(order.getId());
            employeeNotif.setNotificationType(NotificationType.EMPLOYEE_DINE_IN_READY);
            employeeNotif.setMessage("Food Ready to Serve - Table No: " + tableNum + " (Order #" + order.getId() + ")");
            employeeNotif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(employeeNotif);
        }
    }

    /**
     * Triggered when a delivery order changes status to OUT_FOR_DELIVERY.
     * Customer: "Your order is out for delivery"
     */
    @Transactional
    public void handleOutForDeliveryEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        Notification customerNotif = new Notification();
        customerNotif.setRecipientRole(Role.CUSTOMER);
        if (order.getUser() != null) customerNotif.setRecipientUser(order.getUser());
        customerNotif.setBranch(order.getBranch());
        customerNotif.setOrderId(order.getId());
        customerNotif.setNotificationType(NotificationType.CUSTOMER_OUT_FOR_DELIVERY);
        customerNotif.setMessage("Your order #" + order.getId() + " is out for delivery");
        customerNotif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(customerNotif);
    }

    @Transactional
    public void handleDeliveryAcceptedEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        Notification customerNotif = new Notification();
        customerNotif.setRecipientRole(Role.CUSTOMER);
        if (order.getUser() != null) customerNotif.setRecipientUser(order.getUser());
        customerNotif.setBranch(order.getBranch());
        customerNotif.setOrderId(order.getId());
        customerNotif.setNotificationType(NotificationType.CUSTOMER_ACCEPTED);
        customerNotif.setMessage("Your delivery #" + order.getId() + " has been accepted");
        customerNotif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(customerNotif);
    }

    @Transactional
    public void handleOrderPickedUpEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        Notification customerNotif = new Notification();
        customerNotif.setRecipientRole(Role.CUSTOMER);
        if (order.getUser() != null) customerNotif.setRecipientUser(order.getUser());
        customerNotif.setBranch(order.getBranch());
        customerNotif.setOrderId(order.getId());
        customerNotif.setNotificationType(NotificationType.CUSTOMER_PICKED_UP);
        customerNotif.setMessage("Your order #" + order.getId() + " has been picked up");
        customerNotif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(customerNotif);
    }

    @Transactional
    public void handleOrderDeliveredEvent(Order order) {
        if (order == null || order.getBranch() == null) return;

        Notification customerNotif = new Notification();
        customerNotif.setRecipientRole(Role.CUSTOMER);
        if (order.getUser() != null) customerNotif.setRecipientUser(order.getUser());
        customerNotif.setBranch(order.getBranch());
        customerNotif.setOrderId(order.getId());
        customerNotif.setNotificationType(NotificationType.CUSTOMER_DELIVERED);
        customerNotif.setMessage("Your order #" + order.getId() + " has been delivered");
        customerNotif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(customerNotif);
    }

    /**
     * Event listener helper method to dispatch events when order status changes.
     */
    @Transactional
    public void onOrderStatusChanged(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        order.setStatus(newStatus);
        orderRepository.save(order);

        if (newStatus == OrderStatus.PLACED) {
            handleNewOrderEvent(order);
        } else if (newStatus == OrderStatus.READY || newStatus == OrderStatus.AVAILABLE_FOR_DELIVERY) {
            handleOrderReadyEvent(order);
        } else if (newStatus == OrderStatus.ACCEPTED) {
            handleDeliveryAcceptedEvent(order);
        } else if (newStatus == OrderStatus.PICKED_UP) {
            handleOrderPickedUpEvent(order);
        } else if (newStatus == OrderStatus.OUT_FOR_DELIVERY) {
            handleOutForDeliveryEvent(order);
        } else if (newStatus == OrderStatus.DELIVERED || newStatus == OrderStatus.COMPLETED) {
            handleOrderDeliveredEvent(order);
        }
    }

    // --- Query & Read Operations ---

    public List<NotificationDTO> getNotificationsForBranchAndRole(Long branchId, Role role) {
        return notificationRepository.findByBranchIdAndRecipientRoleOrderByCreatedAtDesc(branchId, role).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<NotificationDTO> getNotificationsForUser(Long userId) {
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public NotificationDTO markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + notificationId));
        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return mapToDTO(saved);
    }

    private NotificationDTO mapToDTO(Notification n) {
        return new NotificationDTO(
                n.getId(),
                n.getRecipientRole(),
                n.getRecipientUser() != null ? n.getRecipientUser().getId() : null,
                n.getBranch() != null ? n.getBranch().getId() : null,
                n.getOrderId(),
                n.getNotificationType(),
                n.getMessage(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
