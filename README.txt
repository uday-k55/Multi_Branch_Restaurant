================================================================================
CHEF & EMPLOYEE DASHBOARD - WORKING IMPLEMENTATION BACKUP PACKAGE
================================================================================

1. PURPOSE OF THIS PACKAGE:
This backup package isolates and preserves the complete, working implementation of:
  - Chef Dashboard (Kitchen Display System / KDS)
  - Employee Dashboard (Delivery Operations, Table Serving, & Assignment Portal)
from the Multi-Branch Restaurant application.

It is organized for easy extraction and seamless integration into a collaborator branch
without pulling in unrelated modules (e.g. admin CRUD, customer checkout, reservations).

--------------------------------------------------------------------------------
2. CHEF DASHBOARD FILES INCLUDED:
--------------------------------------------------------------------------------
Frontend:
  - frontend/src/app/pages/chef/chef.ts
      Component logic, signals, order filtering by status (PLACED, CONFIRMED, PREPARING,
      READY/AVAILABLE_FOR_DELIVERY), 4-second polling, and status transition API calls.
  - frontend/src/app/pages/chef/chef.html
      Full KDS responsive board view divided into Kanban columns by status, badge
      indicators, customer name, table number display, and order item breakdowns.
  - frontend/src/app/pages/chef/chef.css
      Component-scoped styles for KDS card headers and lists.
  - frontend/src/app/guards/chef.guard.ts
      Route guard ensuring the user is authenticated and possesses the CHEF (or ADMIN) role.

--------------------------------------------------------------------------------
3. EMPLOYEE DASHBOARD FILES INCLUDED:
--------------------------------------------------------------------------------
Frontend:
  - frontend/src/app/pages/employee/employee.ts
      Component managing available deliveries, assigned deliveries, dine-in food ready
      alerts, order acceptance, Leaflet customer destination maps, and Google Maps routing.
  - frontend/src/app/pages/employee/employee.html
      UI with active status tabs ('available', 'my', 'dinein'), real-time food ready
      banner for table serving, Leaflet location modal, and delivery status actions.
  - frontend/src/app/pages/employee/employee.css
      Pill tab and list styling for employee operations.
  - frontend/src/app/guards/employee.guard.ts
      Route guard ensuring the user is authenticated and possesses the EMPLOYEE (or ADMIN) role.

--------------------------------------------------------------------------------
4. SUPPORTING FRONTEND FILES INCLUDED:
--------------------------------------------------------------------------------
  - frontend/src/app/services/auth.service.ts
      Provides getBranchId(), isLoggedIn(), isChef(), isEmployee(), getPermittedUrlForRole(),
      and user identity signals utilized by both dashboards and guards.
  - frontend/src/app/interceptors/auth.interceptor.ts
      Attaches the Bearer token to all backend HTTP requests so authenticated endpoints succeed.
  - frontend/src/app/app.routes.ts
      Route registrations for '/chef' and '/employee' guarded by chefGuard and employeeGuard.

--------------------------------------------------------------------------------
5. BACKEND FILES INCLUDED:
--------------------------------------------------------------------------------
Controllers:
  - backend/src/main/java/com/restaurant/backend/controller/OrderController.java
      Provides endpoints:
        * GET /api/orders/branch/{branchId}
        * PATCH /api/orders/{id}/status?status={status}
        * GET /api/orders/branches/{branchId}/available-deliveries
        * GET /api/orders/my-deliveries
        * POST /api/orders/{id}/accept-delivery

Services:
  - backend/src/main/java/com/restaurant/backend/service/OrderService.java
      Implements kitchen queues, status state machine validation, delivery assignments,
      branch isolation checks, and customer coordinate protection.
  - backend/src/main/java/com/restaurant/backend/service/DeliveryService.java
      Delivery radius validation and coordinates handling service.
  - backend/src/main/java/com/restaurant/backend/service/NotificationService.java
      Triggers notification events on order placement and order ready for chefs and employees.

Repositories:
  - backend/src/main/java/com/restaurant/backend/repository/OrderRepository.java
      Custom Spring Data JPA queries (findByBranchIdOrderByCreatedAtDesc,
      findByBranchIdAndStatusInOrderByCreatedAtDesc, findByAssignedEmployeeIdOrderByCreatedAtDesc,
      findByIdForUpdate for race condition prevention on delivery acceptance).
  - backend/src/main/java/com/restaurant/backend/repository/OrderItemRepository.java
  - backend/src/main/java/com/restaurant/backend/repository/NotificationRepository.java

DTOs:
  - backend/src/main/java/com/restaurant/backend/dto/OrderDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/OrderItemDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/CreateOrderRequestDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/UpdateOrderRequestDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/OrderItemRequestDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/NotificationDTO.java
  - backend/src/main/java/com/restaurant/backend/dto/DeliveryValidationRequest.java
  - backend/src/main/java/com/restaurant/backend/dto/DeliveryValidationResponse.java

Models & Enums:
  - backend/src/main/java/com/restaurant/backend/model/Order.java
  - backend/src/main/java/com/restaurant/backend/model/OrderItem.java
  - backend/src/main/java/com/restaurant/backend/model/OrderStatus.java
  - backend/src/main/java/com/restaurant/backend/model/OrderType.java
  - backend/src/main/java/com/restaurant/backend/model/Notification.java
  - backend/src/main/java/com/restaurant/backend/model/NotificationType.java
  - backend/src/main/java/com/restaurant/backend/model/Role.java
  - backend/src/main/java/com/restaurant/backend/model/RoleConverter.java

Security Utilities:
  - backend/src/main/java/com/restaurant/backend/util/BranchSecurityUtils.java
      Validates that authenticated staff members only access orders belonging to their branch.

--------------------------------------------------------------------------------
6. WHERE EACH FILE BELONGS IN THE TARGET PROJECT:
--------------------------------------------------------------------------------
Frontend (Angular Project Root):
  - Copy contents of package 'frontend/src/' directly into your Angular 'src/' folder:
      * src/app/pages/chef/*        -> src/app/pages/chef/
      * src/app/pages/employee/*    -> src/app/pages/employee/
      * src/app/guards/chef.guard.ts     -> src/app/guards/chef.guard.ts
      * src/app/guards/employee.guard.ts -> src/app/guards/employee.guard.ts
      * src/app/services/auth.service.ts -> src/app/services/auth.service.ts
      * src/app/interceptors/auth.interceptor.ts -> src/app/interceptors/auth.interceptor.ts
      * src/app/app.routes.ts       -> integrate routes for '/chef' and '/employee'

Backend (Spring Boot Project Root):
  - Copy contents of package 'backend/src/main/java/' directly into your Spring Boot
    'src/main/java/' folder maintaining package hierarchy:
      * com/restaurant/backend/controller/OrderController.java
      * com/restaurant/backend/service/OrderService.java
      * com/restaurant/backend/service/DeliveryService.java
      * com/restaurant/backend/service/NotificationService.java
      * com/restaurant/backend/repository/OrderRepository.java
      * com/restaurant/backend/repository/OrderItemRepository.java
      * com/restaurant/backend/repository/NotificationRepository.java
      * com/restaurant/backend/dto/*
      * com/restaurant/backend/model/*
      * com/restaurant/backend/util/BranchSecurityUtils.java

--------------------------------------------------------------------------------
7. REQUIRED API ENDPOINTS:
--------------------------------------------------------------------------------
Chef Dashboard:
  - GET   /api/orders/branch/{branchId}             : Fetch all orders for the branch queue
  - PATCH /api/orders/{id}/status?status={status}   : Update order state (e.g. PREPARING -> READY)

Employee Dashboard:
  - GET   /api/orders/branches/{branchId}/available-deliveries : Available delivery orders
  - GET   /api/orders/my-deliveries                 : Orders assigned to logged-in employee
  - GET   /api/orders/branch/{branchId}             : Filter for DINE_IN orders with status READY
  - POST  /api/orders/{id}/accept-delivery          : Atomically claim a delivery order
  - PATCH /api/orders/{id}/status?status={status}   : Advance delivery status (e.g. PICKED_UP -> DELIVERED)

--------------------------------------------------------------------------------
8. REQUIRED ROLES & AUTHORIZATION:
--------------------------------------------------------------------------------
  - CHEF: Granted access to /chef route and branch kitchen order endpoints.
  - EMPLOYEE: Granted access to /employee route, delivery claiming, and order status updates.
  - ADMIN: Has global access to all branches and dashboard routes.
  - Branch Scoping: Requests are validated using BranchSecurityUtils to enforce that staff
    can only view and update data for their assigned branch.

--------------------------------------------------------------------------------
9. IMPORTANT INTEGRATION NOTES:
--------------------------------------------------------------------------------
  - Dependencies: Employee dashboard uses Leaflet for map rendering. Ensure Leaflet JS/CSS
    is loaded in index.html or package.json (`npm i leaflet @types/leaflet`).
  - Polling interval: Both dashboards poll every 4000ms (4 seconds) to maintain real-time
    queue updates without requiring a continuous WebSocket server.
  - Concurrency: `accept-delivery` uses pessimistic locking (`findByIdForUpdate`) in
    OrderRepository to prevent race conditions when two employees claim the same delivery.
================================================================================
