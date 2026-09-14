import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css'
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);

  orders = signal<OrderResponse[]>([]);
  loading = signal<boolean>(true);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');
  cancellingOrderId = signal<number | null>(null);
  confirmCancelOrder = signal<OrderResponse | null>(null);

  // Live timer for 5-minute window
  currentTime = signal<number>(Date.now());
  private timerInterval: any = null;

  // Edit order modal state
  editingOrder = signal<OrderResponse | null>(null);
  editingItems = signal<{ foodItemId: number; foodItemName: string; quantity: number; pricePerUnit: number; subtotal: number }[]>([]);
  savingEdit = signal<boolean>(false);
  availableBranchDishes = signal<any[]>([]);
  selectedAddFoodItemId: number | null = null;

  ngOnInit(): void {
    this.loadOrders();
    this.timerInterval = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadOrders(): void {
    this.loading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to fetch your order history.');
      }
    });
  }

  getOrderRemainingSeconds(order: OrderResponse): number {
    if (!order || !order.createdAt) return 0;
    const ineligible = [
      'PREPARING', 'READY', 'AVAILABLE_FOR_DELIVERY', 'ACCEPTED',
      'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'
    ];
    if (ineligible.includes(order.status)) return 0;

    const createdTime = new Date(order.createdAt).getTime();
    if (isNaN(createdTime)) return 0;

    const expiresAt = createdTime + 5 * 60 * 1000;
    const diffSeconds = Math.floor((expiresAt - this.currentTime()) / 1000);
    return Math.max(0, diffSeconds);
  }

  isOrderEligibleForEditCancel(order: OrderResponse): boolean {
    return this.getOrderRemainingSeconds(order) > 0;
  }

  getRemainingCountdownFormatted(order: OrderResponse): string {
    const totalSeconds = this.getOrderRemainingSeconds(order);
    if (totalSeconds <= 0) return '';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  canModifyOrder(order: OrderResponse): boolean {
    return this.isOrderEligibleForEditCancel(order);
  }

  openCancelConfirmation(order: OrderResponse): void {
    if (!this.canModifyOrder(order)) {
      this.errorMsg.set('Cancellation window has expired or order is already being prepared.');
      return;
    }
    this.confirmCancelOrder.set(order);
  }

  closeCancelConfirmation(): void {
    this.confirmCancelOrder.set(null);
  }

  proceedCancelOrder(): void {
    const order = this.confirmCancelOrder();
    if (!order) return;

    if (!this.canModifyOrder(order)) {
      this.confirmCancelOrder.set(null);
      this.errorMsg.set('Cancellation window has expired or order is already being prepared.');
      return;
    }

    this.cancellingOrderId.set(order.id);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.orderService.cancelOrder(order.id).subscribe({
      next: () => {
        this.cancellingOrderId.set(null);
        this.confirmCancelOrder.set(null);
        this.successMsg.set(`Order #${order.id} has been cancelled successfully.`);
        this.loadOrders();
      },
      error: (err) => {
        this.cancellingOrderId.set(null);
        this.confirmCancelOrder.set(null);
        this.errorMsg.set(err.error?.message || 'Failed to cancel order.');
        this.loadOrders();
      }
    });
  }

  openEditModal(order: OrderResponse): void {
    if (!this.canModifyOrder(order)) {
      this.errorMsg.set('Edit window has expired or order is already being prepared and cannot be edited.');
      return;
    }

    this.errorMsg.set('');
    this.successMsg.set('');
    this.editingOrder.set(order);
    this.selectedAddFoodItemId = null;

    this.editingItems.set(order.items.map(i => ({
      foodItemId: i.foodItemId,
      foodItemName: i.foodItemName,
      quantity: i.quantity,
      pricePerUnit: i.pricePerUnit,
      subtotal: i.subtotal
    })));

    if (order.branchId) {
      this.orderService.getCustomerMenu(order.branchId).subscribe({
        next: (dishes) => this.availableBranchDishes.set(dishes || []),
        error: () => this.availableBranchDishes.set([])
      });
    }
  }

  closeEditModal(): void {
    this.editingOrder.set(null);
    this.editingItems.set([]);
    this.selectedAddFoodItemId = null;
  }

  incrementItem(index: number): void {
    const items = [...this.editingItems()];
    items[index].quantity += 1;
    items[index].subtotal = items[index].quantity * items[index].pricePerUnit;
    this.editingItems.set(items);
  }

  decrementItem(index: number): void {
    const items = [...this.editingItems()];
    if (items[index].quantity > 1) {
      items[index].quantity -= 1;
      items[index].subtotal = items[index].quantity * items[index].pricePerUnit;
      this.editingItems.set(items);
    } else {
      this.removeItem(index);
    }
  }

  removeItem(index: number): void {
    const items = [...this.editingItems()];
    if (items.length <= 1) {
      alert('An order must have at least one item. If you wish to cancel the order, please click "Cancel Order".');
      return;
    }
    items.splice(index, 1);
    this.editingItems.set(items);
  }

  addNewDishToOrder(): void {
    if (!this.selectedAddFoodItemId) return;
    const dish = this.availableBranchDishes().find(d => d.id === Number(this.selectedAddFoodItemId));
    if (!dish) return;

    const items = [...this.editingItems()];
    const existingIndex = items.findIndex(i => i.foodItemId === dish.id);
    if (existingIndex >= 0) {
      items[existingIndex].quantity += 1;
      items[existingIndex].subtotal = items[existingIndex].quantity * items[existingIndex].pricePerUnit;
    } else {
      items.push({
        foodItemId: dish.id,
        foodItemName: dish.name,
        quantity: 1,
        pricePerUnit: dish.price,
        subtotal: dish.price
      });
    }
    this.editingItems.set(items);
    this.selectedAddFoodItemId = null;
  }

  get editingSubtotal(): number {
    return this.editingItems().reduce((sum, item) => sum + item.subtotal, 0);
  }

  saveOrderEdit(): void {
    const order = this.editingOrder();
    if (!order) return;

    if (this.editingItems().length === 0) {
      alert('Order must contain at least one item.');
      return;
    }

    this.savingEdit.set(true);
    const payload = this.editingItems().map(i => ({
      foodItemId: i.foodItemId,
      quantity: i.quantity
    }));

    this.orderService.updateOrder(order.id, payload).subscribe({
      next: () => {
        this.savingEdit.set(false);
        this.successMsg.set(`Order #${order.id} updated successfully!`);
        this.closeEditModal();
        this.loadOrders();
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to update order.');
      }
    });
  }
}
