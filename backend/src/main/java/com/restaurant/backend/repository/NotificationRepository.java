package com.restaurant.backend.repository;

import com.restaurant.backend.model.Notification;
import com.restaurant.backend.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByBranchIdAndRecipientRoleOrderByCreatedAtDesc(Long branchId, Role recipientRole);
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId);
    List<Notification> findByBranchIdAndRecipientRoleAndIsReadFalse(Long branchId, Role recipientRole);
}
