package com.restaurant.backend.service;

import com.restaurant.backend.dto.WalletDTO;
import com.restaurant.backend.model.Order;
import com.restaurant.backend.model.User;
import com.restaurant.backend.model.WalletTransaction;

public interface WalletService {
    WalletDTO getWallet(User currentUser);
    WalletTransaction processOrderCancellationRefund(Order order);
}
