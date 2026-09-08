import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  totalAmount: number;
  assignedEmployeeId?: number;
  assignedEmployeeName?: string;
  createdAt: string;
  items: OrderItem[];
}

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee.html',
  styleUrls: ['./employee.css']
})
export class EmployeeComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public authService = inject(AuthService);

  activeTab = signal<'available' | 'my'>('available');
  availableDeliveries = signal<Order[]>([]);
  myDeliveries = signal<Order[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  private pollInterval: any;

  ngOnInit(): void {
    this.loadAllData();
    this.pollInterval = setInterval(() => this.loadAllData(), 4000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadAllData(): void {
    const branchId = this.authService.getBranchId();
    if (!branchId) {
      this.errorMessage.set('No branch assigned to authenticated employee.');
      this.isLoading.set(false);
      return;
    }

    // Load available deliveries
    this.http.get<Order[]>(`http://localhost:8080/api/orders/branches/${branchId}/available-deliveries`).subscribe({
      next: (data) => {
        this.availableDeliveries.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading available deliveries', err);
        this.isLoading.set(false);
      }
    });

    // Load my deliveries
    this.http.get<Order[]>(`http://localhost:8080/api/orders/my-deliveries`).subscribe({
      next: (data) => {
        this.myDeliveries.set(data || []);
      },
      error: (err) => {
        console.error('Error loading my deliveries', err);
      }
    });
  }

  actionLoadingId = signal<number | null>(null);

  acceptDelivery(orderId: number): void {
    this.actionLoadingId.set(orderId);
    this.http.post<Order>(`http://localhost:8080/api/orders/${orderId}/accept-delivery`, {}).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.activeTab.set('my');
        this.loadAllData();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        alert(err.error?.message || 'Failed to accept delivery. It may have already been accepted by another employee.');
        this.loadAllData();
      }
    });
  }

  updateStatus(orderId: number, nextStatus: string): void {
    this.actionLoadingId.set(orderId);
    this.http.patch<Order>(`http://localhost:8080/api/orders/${orderId}/status?status=${nextStatus}`, {}).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.loadAllData();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        alert(err.error?.message || 'Failed to update delivery status');
      }
    });
  }
}
