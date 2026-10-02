import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Branch } from './cart.service';

export interface CreateOrderPayload {
  branchId: number;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: number | null;
  deliveryAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  items: { foodItemId: number; quantity: number }[];
}

export interface OrderItemResponse {
  id: number;
  foodItemId: number;
  foodItemName: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface OrderResponse {
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
  subtotal: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItemResponse[];
}

export interface DeliveryValidationResponse {
  allowed: boolean;
  message: string;
  distanceKm?: number;
}

export interface RestaurantTable {
  id: number;
  branchId?: number;
  branchName?: string;
  tableNumber: string;
  capacity: number;
  active?: boolean;
  status?: string;
  qrCode?: string;
}

export interface ReservationRequest {
  branchId: number;
  tableId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  numberOfPeople: number;
  specialRequests?: string;
}

export interface ReservationResponse {
  id: number;
  branchId: number;
  branchName: string;
  tableId: number;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  numberOfPeople: number;
  specialRequests?: string;
  status: string;
  createdAt: string;
}

export interface PaymentRequest {
  orderId: number;
  amount: number;
  paymentMethod?: string;
}

export interface PaymentResponse {
  id: number;
  orderId: number;
  orderType: string;
  branchId: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProcessRequest {
  status: 'PAID' | 'FAILED';
  transactionId?: string;
  paymentMethod?: string;
  failureReason?: string;
}


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = 'https://multi-branch-restaurant.onrender.com/api';

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.apiUrl}/branches`);
  }

  getStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/branches/states`);
  }

  getDistricts(state: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/branches/districts`, {
      params: { state }
    });
  }

  getBranchesByFilter(state?: string, district?: string, activeOnly?: boolean): Observable<Branch[]> {
    let params = new HttpParams();
    if (state) params = params.set('state', state);
    if (district) params = params.set('district', district);
    if (activeOnly !== undefined) params = params.set('activeOnly', activeOnly.toString());
    return this.http.get<Branch[]>(`${this.apiUrl}/branches`, { params });
  }

  getCustomerMenu(branchId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/menu/branches/${branchId}/customer-menu`);
  }

  getBranchTables(branchId: number): Observable<RestaurantTable[]> {
    return this.http.get<RestaurantTable[]>(`${this.apiUrl}/tables/branches/${branchId}`);
  }

  getTableByQrCode(qrCode: string): Observable<RestaurantTable> {
    return this.http.get<RestaurantTable>(`${this.apiUrl}/tables/qr/${qrCode}`);
  }

  findAvailableTables(branchId: number, date: string, time: string, numberOfPeople: number): Observable<RestaurantTable[]> {
    return this.http.get<RestaurantTable[]>(`${this.apiUrl}/reservations/available-tables`, {
      params: {
        branchId: branchId.toString(),
        date,
        time,
        numberOfPeople: numberOfPeople.toString()
      }
    });
  }

  createReservation(payload: ReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.apiUrl}/reservations`, payload);
  }

  validateDelivery(branchId: number, latitude: number, longitude: number): Observable<DeliveryValidationResponse> {
    return this.http.post<DeliveryValidationResponse>(`${this.apiUrl}/delivery/validate/${branchId}`, {
      latitude,
      longitude
    });
  }

  createOrder(payload: CreateOrderPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/orders`, payload);
  }

  getMyOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/orders/my`);
  }

  getOrderById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/orders/${id}`);
  }

  cancelOrder(orderId: number): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.apiUrl}/orders/${orderId}/cancel`, {});
  }

  updateOrder(orderId: number, items: { foodItemId: number; quantity: number }[]): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/orders/${orderId}`, { items });
  }

  // --- Payment Endpoints ---

  initiatePayment(payload: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/payments/initiate`, payload);
  }

  processPayment(paymentId: number, payload: PaymentProcessRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/payments/${paymentId}/process`, payload);
  }

  getPaymentByOrder(orderId: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/payments/order/${orderId}`);
  }

  // --- Customer Reservation Endpoints ---
  getMyReservations(): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.apiUrl}/reservations/my`);
  }

  cancelMyReservation(reservationId: number): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(`${this.apiUrl}/reservations/${reservationId}/cancel`, {});
  }

  getBranchOrders(branchId: number): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/orders/branch/${branchId}`);
  }
}
