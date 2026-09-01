import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService, OrderType, Branch } from '../../services/cart.service';
import { OrderService, RestaurantTable } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  protected cartService = inject(CartService);
  private orderService = inject(OrderService);
  protected authService = inject(AuthService);
  private router = inject(Router);

  branches = signal<Branch[]>([]);
  tables = signal<RestaurantTable[]>([]);

  selectedBranchId = signal<number | null>(null);
  selectedOrderType = signal<OrderType>('DINE_IN');
  selectedTableId = signal<number | null>(null);

  deliveryAddress = signal<string>('');
  latitude = signal<number | null>(10.0100);
  longitude = signal<number | null>(76.3600);

  validatingDelivery = signal<boolean>(false);
  deliveryValid = signal<boolean | null>(null);
  deliveryMsg = signal<string>('');
  deliveryDistance = signal<number | null>(null);

  submitting = signal<boolean>(false);
  errorMsg = signal<string>('');

  ngOnInit(): void {
    this.loadBranches();
    this.selectedOrderType.set(this.cartService.orderType());
    this.deliveryAddress.set(this.cartService.deliveryAddress() || '');
    if (this.cartService.latitude() !== null) this.latitude.set(this.cartService.latitude());
    if (this.cartService.longitude() !== null) this.longitude.set(this.cartService.longitude());
  }

  loadBranches(): void {
    this.orderService.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data);
        const existingBranch = this.cartService.selectedBranch();
        if (existingBranch && data.some(b => b.id === existingBranch.id)) {
          this.selectedBranchId.set(existingBranch.id);
          this.loadTables(existingBranch.id);
        } else if (data.length > 0) {
          this.selectedBranchId.set(data[0].id);
          this.cartService.setBranch(data[0]);
          this.loadTables(data[0].id);
        }
      },
      error: () => {
        this.errorMsg.set('Failed to load restaurant branches.');
      }
    });
  }

  onBranchChange(event: Event): void {
    const branchId = Number((event.target as HTMLSelectElement).value);
    this.selectedBranchId.set(branchId);
    const branch = this.branches().find(b => b.id === branchId) || null;
    this.cartService.setBranch(branch);
    this.selectedTableId.set(null);
    this.cartService.setTable(null);
    this.deliveryValid.set(null);
    this.loadTables(branchId);
  }

  loadTables(branchId: number): void {
    this.orderService.getBranchTables(branchId).subscribe({
      next: (data) => {
        this.tables.set(data);
        if (this.cartService.selectedTableId()) {
          this.selectedTableId.set(this.cartService.selectedTableId());
        } else if (data.length > 0) {
          this.selectedTableId.set(data[0].id);
          this.cartService.setTable(data[0].id, data[0].tableNumber);
        }
      },
      error: () => {
        this.tables.set([]);
      }
    });
  }

  onOrderTypeChange(type: OrderType): void {
    this.selectedOrderType.set(type);
    this.cartService.setOrderType(type);
    this.errorMsg.set('');
  }

  onTableChange(event: Event): void {
    const tableId = Number((event.target as HTMLSelectElement).value);
    this.selectedTableId.set(tableId);
    const tbl = this.tables().find(t => t.id === tableId);
    this.cartService.setTable(tableId, tbl ? tbl.tableNumber : null);
  }

  validateDeliveryRadius(): void {
    if (!this.selectedBranchId()) {
      this.errorMsg.set('Please select a branch first.');
      return;
    }
    if (this.latitude() === null || this.longitude() === null) {
      this.errorMsg.set('Latitude and Longitude are required for delivery validation.');
      return;
    }

    this.validatingDelivery.set(true);
    this.errorMsg.set('');
    this.orderService.validateDelivery(this.selectedBranchId()!, this.latitude()!, this.longitude()!).subscribe({
      next: (res) => {
        this.validatingDelivery.set(false);
        this.deliveryValid.set(res.allowed);
        this.deliveryMsg.set(res.message);
        this.deliveryDistance.set(res.distanceKm ?? null);
        this.cartService.setDeliveryInfo(this.deliveryAddress(), this.latitude(), this.longitude());
      },
      error: (err) => {
        this.validatingDelivery.set(false);
        this.deliveryValid.set(false);
        this.deliveryMsg.set(err.error?.message || 'Failed to validate delivery radius.');
      }
    });
  }

  submitOrder(): void {
    this.errorMsg.set('');

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    if (this.cartService.items().length === 0) {
      this.errorMsg.set('Your cart is empty. Please add items from the menu.');
      return;
    }

    if (!this.selectedBranchId()) {
      this.errorMsg.set('Please select a branch.');
      return;
    }

    const orderType = this.selectedOrderType();

    if (orderType === 'DINE_IN' && !this.selectedTableId()) {
      this.errorMsg.set('Table selection is required for Dine-In orders.');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!this.deliveryAddress().trim()) {
        this.errorMsg.set('Delivery address is required for Home Delivery orders.');
        return;
      }
      if (this.latitude() === null || this.longitude() === null) {
        this.errorMsg.set('Coordinates are required for delivery validation.');
        return;
      }
      if (this.deliveryValid() === false) {
        this.errorMsg.set('Delivery location is outside the 10 km radius limit for this branch.');
        return;
      }
    }

    const payload = {
      branchId: this.selectedBranchId()!,
      orderType: orderType,
      tableId: orderType === 'DINE_IN' ? this.selectedTableId() : null,
      deliveryAddress: orderType === 'DELIVERY' ? this.deliveryAddress().trim() : undefined,
      latitude: orderType === 'DELIVERY' ? this.latitude() : undefined,
      longitude: orderType === 'DELIVERY' ? this.longitude() : undefined,
      items: this.cartService.items().map(i => ({
        foodItemId: i.foodItem.id,
        quantity: i.quantity
      }))
    };

    this.submitting.set(true);

    this.orderService.createOrder(payload).subscribe({
      next: (createdOrder) => {
        this.cartService.clearCart();
        
        // Initiate demo payment for order
        this.orderService.initiatePayment({
          orderId: createdOrder.id,
          amount: createdOrder.totalAmount,
          paymentMethod: 'DEMO'
        }).subscribe({
          next: (payment) => {
            this.submitting.set(false);
            this.router.navigate(['/payment', payment.id], {
              queryParams: { orderId: createdOrder.id, amount: createdOrder.totalAmount }
            });
          },
          error: () => {
            this.submitting.set(false);
            this.router.navigate(['/order-success', createdOrder.id]);
          }
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const backendMessage = err.error?.message || err.message || 'Failed to place order. Please try again.';
        this.errorMsg.set(backendMessage);
      }
    });
  }
}
