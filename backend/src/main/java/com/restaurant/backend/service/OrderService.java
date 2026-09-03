package com.restaurant.backend.service;

import com.restaurant.backend.dto.*;
import com.restaurant.backend.model.*;
import com.restaurant.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Autowired
    private RestaurantTableRepository tableRepository;

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.restaurant.backend.util.BranchSecurityUtils branchSecurityUtils;

    @Transactional
    public OrderDTO createOrder(User currentUser, CreateOrderRequestDTO dto) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in to place an order");
        }

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart cannot be empty");
        }

        if (dto.getBranchId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch ID is required");
        }

        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid branch ID: " + dto.getBranchId()));

        if (dto.getOrderType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order type is required");
        }

        RestaurantTable table = null;
        if (dto.getOrderType() == OrderType.DINE_IN) {
            if (dto.getTableId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Table selection is required for DINE_IN orders");
            }
            table = tableRepository.findById(dto.getTableId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid table ID: " + dto.getTableId()));

            if (!table.getBranch().getId().equals(branch.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Table does not belong to the selected branch");
            }
        } else if (dto.getOrderType() == OrderType.DELIVERY) {
            if (dto.getDeliveryAddress() == null || dto.getDeliveryAddress().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery address is required for DELIVERY orders");
            }
            if (dto.getLatitude() == null || dto.getLongitude() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery coordinates (latitude and longitude) are required");
            }

            DeliveryValidationRequest deliveryRequest = new DeliveryValidationRequest(dto.getLatitude(), dto.getLongitude());
            DeliveryValidationResponse deliveryResponse = deliveryService.validateDeliveryRadius(branch.getId(), deliveryRequest);
            if (!deliveryResponse.isAllowed()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, deliveryResponse.getMessage());
            }
        }

        Order order = new Order();
        order.setUser(currentUser);
        order.setBranch(branch);
        order.setOrderType(dto.getOrderType());
        order.setStatus(OrderStatus.PLACED);
        order.setTable(table);
        order.setDeliveryAddress(dto.getDeliveryAddress());
        order.setLatitude(dto.getLatitude());
        order.setLongitude(dto.getLongitude());
        order.setCreatedAt(LocalDateTime.now());

        double totalSubtotal = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequestDTO itemReq : dto.getItems()) {
            if (itemReq.getFoodItemId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Food item ID is required for each item");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item quantity must be greater than 0");
            }

            FoodItem foodItem = foodItemRepository.findById(itemReq.getFoodItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Food item not found with ID: " + itemReq.getFoodItemId()));

            if (!foodItem.isEnabled()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Food item '" + foodItem.getName() + "' is currently unavailable");
            }

            // Always calculate price from database price
            double unitPrice = foodItem.getPrice();
            double itemSubtotal = unitPrice * itemReq.getQuantity();

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setFoodItem(foodItem);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setPricePerUnit(unitPrice);
            orderItem.setSubtotal(itemSubtotal);

            orderItems.add(orderItem);
            totalSubtotal += itemSubtotal;
        }

        order.setSubtotal(totalSubtotal);
        order.setTotalAmount(totalSubtotal);
        order.setItems(orderItems);

        Order savedOrder = orderRepository.save(order);

        try {
            notificationService.handleNewOrderEvent(savedOrder);
        } catch (Exception e) {
            // Log warning, notification shouldn't break order creation
        }

        return mapToDTO(savedOrder);
    }

    public List<OrderDTO> getMyOrders(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public OrderDTO getOrderById(User currentUser, Long orderId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        Long orderUserId = order.getUser() != null ? order.getUser().getId() : null;
        Long orderBranchId = order.getBranch() != null ? order.getBranch().getId() : null;

        branchSecurityUtils.validateOrderAccess(currentUser, orderUserId, orderBranchId);

        return mapToDTO(order);
    }

    public List<OrderDTO> getBranchOrders(User currentUser, Long branchId) {
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        List<Order> orders = orderRepository.findByBranchIdOrderByCreatedAtDesc(branchId);
        return orders.stream().map(order -> {
            OrderDTO dto = this.mapToDTO(order);
            if (currentUser != null && currentUser.getRole() == Role.EMPLOYEE && order.getOrderType() == OrderType.DELIVERY) {
                if (order.getAssignedEmployee() == null || !order.getAssignedEmployee().getId().equals(currentUser.getId())) {
                    dto.setLatitude(null);
                    dto.setLongitude(null);
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }

    public List<OrderDTO> getAllOrdersForAdmin(User currentUser) {
        if (currentUser == null || currentUser.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: Admin role required");
        }
        return orderRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getAvailableDeliveriesForBranch(User currentUser, Long branchId) {
        branchSecurityUtils.validateBranchAccess(currentUser, branchId);
        List<Order> orders = orderRepository.findByBranchIdAndStatusInOrderByCreatedAtDesc(
                branchId, List.of(OrderStatus.AVAILABLE_FOR_DELIVERY, OrderStatus.READY));
        return orders.stream()
                .filter(o -> o.getOrderType() == OrderType.DELIVERY && o.getAssignedEmployee() == null)
                .map(order -> {
                    OrderDTO dto = this.mapToDTO(order);
                    // Protect customer delivery coordinates until accepted by the specific handling employee
                    dto.setLatitude(null);
                    dto.setLongitude(null);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getMyAssignedDeliveries(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }
        List<Order> orders = orderRepository.findByAssignedEmployeeIdOrderByCreatedAtDesc(currentUser.getId());
        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO acceptDelivery(User currentUser, Long orderId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        if (currentUser.getRole() != Role.EMPLOYEE && currentUser.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only employees can accept deliveries");
        }

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        branchSecurityUtils.validateBranchAccess(currentUser, order.getBranch() != null ? order.getBranch().getId() : null);

        if (order.getOrderType() != OrderType.DELIVERY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order is not a delivery order");
        }

        if (order.getStatus() != OrderStatus.AVAILABLE_FOR_DELIVERY && order.getStatus() != OrderStatus.READY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery is no longer available for acceptance (current status: " + order.getStatus() + ")");
        }

        if (order.getAssignedEmployee() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery has already been accepted by another employee (" + order.getAssignedEmployee().getFirstName() + ")");
        }

        order.setAssignedEmployee(currentUser);
        order.setStatus(OrderStatus.ACCEPTED);
        Order saved = orderRepository.save(order);

        if (notificationService != null) {
            notificationService.onOrderStatusChanged(saved.getId(), OrderStatus.ACCEPTED);
        }

        return mapToDTO(saved);
    }

    @Transactional
    public OrderDTO updateOrderStatus(User currentUser, Long orderId, OrderStatus newStatus) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        Long orderUserId = order.getUser() != null ? order.getUser().getId() : null;
        Long orderBranchId = order.getBranch() != null ? order.getBranch().getId() : null;

        branchSecurityUtils.validateOrderAccess(currentUser, orderUserId, orderBranchId);

        // Employee specific check: Employee can only update orders assigned to themselves if assigned
        if (currentUser.getRole() == Role.EMPLOYEE) {
            if (order.getAssignedEmployee() != null && !order.getAssignedEmployee().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: You can only update deliveries assigned to you");
            }
        }

        // Auto transition READY -> AVAILABLE_FOR_DELIVERY for DELIVERY orders
        if (newStatus == OrderStatus.READY && order.getOrderType() == OrderType.DELIVERY) {
            newStatus = OrderStatus.AVAILABLE_FOR_DELIVERY;
        }

        // Validate state transitions
        if (!isValidStatusTransition(order.getStatus(), newStatus, order.getOrderType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status transition from " + order.getStatus() + " to " + newStatus);
        }

        order.setStatus(newStatus);
        Order updated = orderRepository.save(order);
        if (notificationService != null) {
            notificationService.onOrderStatusChanged(updated.getId(), newStatus);
        }
        return mapToDTO(updated);
    }

    @Transactional
    public OrderDTO cancelOrder(User currentUser, Long orderId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        if (currentUser.getRole() != Role.ADMIN && (order.getUser() == null || !order.getUser().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: You can only cancel your own orders");
        }

        if (order.getStatus() == OrderStatus.PREPARING ||
            order.getStatus() == OrderStatus.READY ||
            order.getStatus() == OrderStatus.AVAILABLE_FOR_DELIVERY ||
            order.getStatus() == OrderStatus.ACCEPTED ||
            order.getStatus() == OrderStatus.PICKED_UP ||
            order.getStatus() == OrderStatus.OUT_FOR_DELIVERY ||
            order.getStatus() == OrderStatus.DELIVERED ||
            order.getStatus() == OrderStatus.COMPLETED ||
            order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be cancelled in current status: " + order.getStatus());
        }

        if (currentUser.getRole() != Role.ADMIN) {
            if (order.getCreatedAt() != null) {
                long secondsElapsed = java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (secondsElapsed > 300) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancellation window has expired. Orders can only be cancelled within 5 minutes of placing.");
                }
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order updated = orderRepository.save(order);
        if (notificationService != null) {
            notificationService.onOrderStatusChanged(updated.getId(), OrderStatus.CANCELLED);
        }
        return mapToDTO(updated);
    }

    @Transactional
    public OrderDTO updateOrderItems(User currentUser, Long orderId, UpdateOrderRequestDTO dto) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User must be logged in");
        }

        if (dto == null || dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must contain at least one item");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        if (currentUser.getRole() != Role.ADMIN && (order.getUser() == null || !order.getUser().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: You can only edit your own orders");
        }

        if (order.getStatus() == OrderStatus.PREPARING ||
            order.getStatus() == OrderStatus.READY ||
            order.getStatus() == OrderStatus.AVAILABLE_FOR_DELIVERY ||
            order.getStatus() == OrderStatus.ACCEPTED ||
            order.getStatus() == OrderStatus.PICKED_UP ||
            order.getStatus() == OrderStatus.OUT_FOR_DELIVERY ||
            order.getStatus() == OrderStatus.DELIVERED ||
            order.getStatus() == OrderStatus.COMPLETED ||
            order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be edited once preparation has started (current status: " + order.getStatus() + ")");
        }

        if (currentUser.getRole() != Role.ADMIN) {
            if (order.getCreatedAt() != null) {
                long secondsElapsed = java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (secondsElapsed > 300) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Edit window has expired. Orders can only be edited within 5 minutes of placing.");
                }
            }
        }

        order.getItems().clear();
        double totalSubtotal = 0.0;

        for (OrderItemRequestDTO itemReq : dto.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                continue;
            }

            FoodItem foodItem = foodItemRepository.findById(itemReq.getFoodItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food item not found with ID: " + itemReq.getFoodItemId()));

            double unitPrice = foodItem.getPrice();
            double itemSubtotal = unitPrice * itemReq.getQuantity();

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setFoodItem(foodItem);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setPricePerUnit(unitPrice);
            orderItem.setSubtotal(itemSubtotal);

            order.getItems().add(orderItem);
            totalSubtotal += itemSubtotal;
        }

        if (order.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must have at least one valid item with quantity > 0");
        }

        order.setSubtotal(totalSubtotal);
        order.setTotalAmount(totalSubtotal);

        Order saved = orderRepository.save(order);
        return mapToDTO(saved);
    }

    private boolean isValidStatusTransition(OrderStatus current, OrderStatus next, OrderType orderType) {
        if (current == next) return true;

        switch (current) {
            case PLACED:
                return next == OrderStatus.CONFIRMED || next == OrderStatus.PREPARING || next == OrderStatus.CANCELLED;
            case CONFIRMED:
                return next == OrderStatus.PREPARING || next == OrderStatus.CANCELLED;
            case PREPARING:
                return next == OrderStatus.READY || next == OrderStatus.AVAILABLE_FOR_DELIVERY;
            case READY:
                return next == OrderStatus.AVAILABLE_FOR_DELIVERY || next == OrderStatus.ACCEPTED || next == OrderStatus.COMPLETED || next == OrderStatus.DELIVERED;
            case AVAILABLE_FOR_DELIVERY:
                return next == OrderStatus.ACCEPTED;
            case ACCEPTED:
                return next == OrderStatus.PICKED_UP;
            case PICKED_UP:
                return next == OrderStatus.OUT_FOR_DELIVERY;
            case OUT_FOR_DELIVERY:
                return next == OrderStatus.DELIVERED || next == OrderStatus.COMPLETED;
            case DELIVERED:
                return next == OrderStatus.COMPLETED;
            case COMPLETED:
            case CANCELLED:
                return false;
            default:
                return false;
        }
    }

    public OrderDTO mapToDTO(Order order) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setUserId(order.getUser() != null ? order.getUser().getId() : null);
        dto.setCustomerName(order.getUser() != null ? order.getUser().getFirstName() + " " + order.getUser().getLastName() : "Guest");
        dto.setBranchId(order.getBranch() != null ? order.getBranch().getId() : null);
        dto.setBranchName(order.getBranch() != null ? order.getBranch().getName() : null);
        dto.setOrderType(order.getOrderType());
        dto.setStatus(order.getStatus());
        dto.setTableId(order.getTable() != null ? order.getTable().getId() : null);
        dto.setTableNumber(order.getTable() != null ? order.getTable().getTableNumber() : null);
        dto.setDeliveryAddress(order.getDeliveryAddress());
        dto.setLatitude(order.getLatitude());
        dto.setLongitude(order.getLongitude());
        dto.setSubtotal(order.getSubtotal());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setAssignedEmployeeId(order.getAssignedEmployee() != null ? order.getAssignedEmployee().getId() : null);
        dto.setAssignedEmployeeName(order.getAssignedEmployee() != null ? order.getAssignedEmployee().getFirstName() + " " + order.getAssignedEmployee().getLastName() : null);
        dto.setCreatedAt(order.getCreatedAt());

        if (order.getItems() != null) {
            List<OrderItemDTO> itemDTOs = order.getItems().stream().map(item -> new OrderItemDTO(
                    item.getId(),
                    item.getFoodItem() != null ? item.getFoodItem().getId() : null,
                    item.getFoodItem() != null ? item.getFoodItem().getName() : "Unknown Item",
                    item.getQuantity(),
                    item.getPricePerUnit(),
                    item.getSubtotal()
            )).collect(Collectors.toList());
            dto.setItems(itemDTOs);
        }
        return dto;
    }
}
