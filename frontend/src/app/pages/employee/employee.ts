import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

declare const L: any;

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

  activeTab = signal<'available' | 'my' | 'dinein'>('available');
  availableDeliveries = signal<Order[]>([]);
  myDeliveries = signal<Order[]>([]);
  readyDineInOrders = signal<Order[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  private pollInterval: any;

  viewingOrderLocation = signal<Order | null>(null);
  showLocationModal = signal<boolean>(false);
  private customerMap: any = null;
  private customerMarker: any = null;

  ngOnInit(): void {
    this.loadAllData();
    this.pollInterval = setInterval(() => this.loadAllData(), 4000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.customerMap) {
      this.customerMap.remove();
      this.customerMap = null;
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

    // Load ready dine-in orders for table serving
    this.http.get<Order[]>(`http://localhost:8080/api/orders/branch/${branchId}`).subscribe({
      next: (data) => {
        const readyDineIn = (data || []).filter(o => o.orderType === 'DINE_IN' && o.status === 'READY');
        this.readyDineInOrders.set(readyDineIn);
      },
      error: (err) => {
        console.error('Error loading branch orders for dine-in serving', err);
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

  openCustomerLocationModal(order: Order): void {
    if (order.latitude == null || order.longitude == null) {
      alert('Customer coordinates are not available for this order.');
      return;
    }
    this.viewingOrderLocation.set(order);
    this.showLocationModal.set(true);

    setTimeout(() => {
      this.initCustomerMap(order.latitude!, order.longitude!, order.customerName, order.deliveryAddress || 'Customer Delivery Address');
    }, 200);
  }

  closeCustomerLocationModal(): void {
    this.showLocationModal.set(false);
    this.viewingOrderLocation.set(null);
    if (this.customerMap) {
      this.customerMap.remove();
      this.customerMap = null;
      this.customerMarker = null;
    }
  }

  private initCustomerMap(lat: number, lng: number, customerName: string, address: string): void {
    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not available.');
      return;
    }

    const container = document.getElementById('customer-delivery-map');
    if (!container) return;

    if (this.customerMap) {
      this.customerMap.remove();
      this.customerMap = null;
    }

    const customIcon = L.divIcon({
      className: 'custom-customer-marker',
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);">
               <span style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));">📍</span>
               <span style="background:#212529;color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px;border:1px solid #ffc107;white-space:nowrap;margin-top:2px;">Customer Destination</span>
             </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42]
    });

    this.customerMap = L.map(container).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.customerMap);

    this.customerMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.customerMap);
    this.customerMarker.bindPopup(`<strong>${customerName}</strong><br/>${address}`).openPopup();

    setTimeout(() => {
      if (this.customerMap) {
        this.customerMap.invalidateSize();
      }
    }, 250);
  }

  navigateToCustomer(order: Order): void {
    if (order.latitude == null || order.longitude == null) {
      alert('Customer coordinates are not available for this delivery order.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
