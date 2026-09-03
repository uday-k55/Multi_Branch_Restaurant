import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

export interface OrderItem {
  id: number;
  foodItemId: number;
  foodItemName: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface Order {
  id: number;
  userId: number;
  customerName: string;
  branchId: number;
  branchName: string;
  orderType: string;
  status: string;
  tableId?: number;
  tableNumber?: string;
  deliveryAddress?: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

@Component({
  selector: 'app-chef',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chef.html',
  styleUrls: ['./chef.css']
})
export class ChefComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public authService = inject(AuthService);

  orders = signal<Order[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  private pollInterval: any;

  placedOrders = computed(() => this.orders().filter(o => o.status === 'PLACED'));
  confirmedOrders = computed(() => this.orders().filter(o => o.status === 'CONFIRMED'));
  preparingOrders = computed(() => this.orders().filter(o => o.status === 'PREPARING'));
  readyOrders = computed(() => this.orders().filter(o => o.status === 'READY' || o.status === 'AVAILABLE_FOR_DELIVERY'));

  ngOnInit(): void {
    this.loadOrders();
    this.pollInterval = setInterval(() => this.loadOrders(), 4000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadOrders(): void {
    const branchId = this.authService.getBranchId();
    if (!branchId) {
      this.errorMessage.set('No branch assigned to authenticated chef.');
      this.isLoading.set(false);
      return;
    }

    this.http.get<Order[]>(`http://localhost:8080/api/orders/branch/${branchId}`).subscribe({
      next: (data) => {
        this.orders.set(data || []);
        this.isLoading.set(false);
        this.errorMessage.set('');
      },
      error: (err) => {
        console.error('Failed to load kitchen orders', err);
        this.errorMessage.set(err.error?.message || 'Failed to load kitchen orders');
        this.isLoading.set(false);
      }
    });
  }

  actionLoadingId = signal<number | null>(null);

  updateStatus(orderId: number, nextStatus: string): void {
    this.actionLoadingId.set(orderId);
    this.http.patch<Order>(`http://localhost:8080/api/orders/${orderId}/status?status=${nextStatus}`, {}).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.loadOrders();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        alert(err.error?.message || 'Failed to update order status');
      }
    });
  }
}
