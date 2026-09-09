import { Component, OnInit, signal, inject } from '@angular/core';
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
export class MyOrdersComponent implements OnInit {
  private orderService = inject(OrderService);

  orders = signal<OrderResponse[]>([]);
  loading = signal<boolean>(true);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');
  cancellingOrderId = signal<number | null>(null);

  // Edit order modal state
  editingOrder = signal<OrderResponse | null>(null);
  editingItems = signal<{ foodItemId: number; foodItemName: string; quantity: number; pricePerUnit: number; subtotal: number }[]>([]);
  savingEdit = signal<boolean>(false);
  availableBranchDishes = signal<any[]>([]);
  selectedAddFoodItemId: number | null = null;

  ngOnInit(): void {
    this.loadOrders();
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

  canModifyOrder(status: string): boolean {
    return status === 'PLACED' || status === 'PENDING' || status === 'CONFIRMED';
  }

  cancelOrder(order: OrderResponse): void {
    if (!this.canModifyOrder(order.status)) {
      this.errorMsg.set('This order is already being prepared or completed and cannot be cancelled.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    this.cancellingOrderId.set(order.id);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.orderService.cancelOrder(order.id).subscribe({
      next: () => {
        this.cancellingOrderId.set(null);
        this.successMsg.set(`Order #${order.id} has been cancelled successfully.`);
        this.loadOrders();
      },
      error: (err) => {
        this.cancellingOrderId.set(null);
        this.errorMsg.set(err.error?.message || 'Failed to cancel order.');
      }
    });
  }

  openEditModal(order: OrderResponse): void {
    if (!this.canModifyOrder(order.status)) {
      this.errorMsg.set('This order is already being prepared and cannot be edited.');
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
