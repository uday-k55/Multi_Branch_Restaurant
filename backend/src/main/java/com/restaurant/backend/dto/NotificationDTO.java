package com.restaurant.backend.dto;

import com.restaurant.backend.model.NotificationType;
import com.restaurant.backend.model.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Role recipientRole;
    private Long recipientUserId;
    private Long branchId;
    private Long orderId;
    private NotificationType notificationType;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;
}
