import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Branch } from './cart.service';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  role: 'ADMIN' | 'BRANCH_MANAGER' | 'CHEF' | 'EMPLOYEE' | 'CUSTOMER';
  branchId?: number;
  branchName?: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender?: string;
  password?: string;
  role: 'BRANCH_MANAGER' | 'CHEF' | 'EMPLOYEE';
  branchId: number;
}

export interface DashboardStats {
  totalBranches: number;
  todaysOrders: number;
  todaysSales: number;
  activeEmployees: number;
  pendingOrders: number;
  pendingDeliveries: number;
  totalReservations: number;
  lowStockItemsCount: number;
}

export interface MenuCategory {
  id: number;
  branchId: number;
  name: string;
  description?: string;
}

export interface FoodItemAdmin {
  id: number;
  branchId: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  enabled: boolean;
  isSeasonal?: boolean;
}

export interface InventoryCategory {
  id: number;
  branchId: number;
  name: string;
  description?: string;
}

export interface InventoryItemAdmin {
  id: number;
  branchId: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockThreshold: number;
  costPerUnit?: number;
  lowStock?: boolean;
}

export interface InventoryTransaction {
  id: number;
  branchId: number;
  inventoryItemId: number;
  inventoryItemName?: string;
  transactionType: 'STOCK_IN' | 'STOCK_OUT' | 'USAGE' | 'AUDIT';
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  reason?: string;
  referenceNumber?: string;
  createdAt: string;
}

export interface StockAdjustment {
  quantity: number;
  transactionType: 'STOCK_IN' | 'STOCK_OUT' | 'USAGE' | 'AUDIT';
  unitPrice?: number;
  reason?: string;
  referenceNumber?: string;
}

export interface TableAdmin {
  id: number;
  branchId?: number;
  branchName?: string;
  tableNumber: string;
  capacity: number;
  active?: boolean;
  status?: string;
  qrCode?: string;
}

export interface ReservationAdmin {
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
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api';

  getDashboardOverview(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard`);
  }

  // --- Branch APIs ---
  getBranches(state?: string, district?: string, activeOnly?: boolean): Observable<Branch[]> {
    let params = new HttpParams();
    if (state) params = params.set('state', state);
    if (district) params = params.set('district', district);
    if (activeOnly !== undefined) params = params.set('activeOnly', activeOnly.toString());
    return this.http.get<Branch[]>(`${this.apiUrl}/branches`, { params });
  }

  getBranchById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/branches/${id}`);
  }

  getStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/branches/states`);
  }

  getDistricts(state: string): Observable<string[]> {
    const params = new HttpParams().set('state', state);
    return this.http.get<string[]>(`${this.apiUrl}/branches/districts`, { params });
  }

  createBranch(branch: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(`${this.apiUrl}/branches`, branch);
  }

  updateBranch(id: number, branch: Partial<Branch>): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/branches/${id}`, branch);
  }

  setBranchActiveStatus(id: number, active: boolean): Observable<Branch> {
    return this.http.patch<Branch>(`${this.apiUrl}/branches/${id}/status?active=${active}`, {});
  }

  deleteBranch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/branches/${id}`);
  }

  // --- Employee APIs ---
  getEmployees(branchId?: number, role?: string): Observable<Employee[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (role) params = params.set('role', role);
    return this.http.get<Employee[]>(`${this.apiUrl}/admin/employees`, { params });
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/admin/employees/${id}`);
  }

  createEmployee(employee: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/admin/employees`, employee);
  }

  updateEmployee(id: number, employee: Partial<CreateEmployeeRequest>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/admin/employees/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/employees/${id}`);
  }

  // --- Menu Management APIs ---
  getCategories(branchId: number): Observable<MenuCategory[]> {
    return this.http.get<MenuCategory[]>(`${this.apiUrl}/menu/branches/${branchId}/categories`);
  }

  addCategory(branchId: number, category: Partial<MenuCategory>): Observable<MenuCategory> {
    return this.http.post<MenuCategory>(`${this.apiUrl}/menu/branches/${branchId}/categories`, category);
  }

  updateCategory(categoryId: number, category: Partial<MenuCategory>): Observable<MenuCategory> {
    return this.http.put<MenuCategory>(`${this.apiUrl}/menu/categories/${categoryId}`, category);
  }

  deleteCategory(categoryId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/menu/categories/${categoryId}`);
  }

  getFoodItems(branchId: number): Observable<FoodItemAdmin[]> {
    return this.http.get<FoodItemAdmin[]>(`${this.apiUrl}/menu/branches/${branchId}/items`);
  }

  addFoodItem(branchId: number, categoryId: number, item: Partial<FoodItemAdmin>): Observable<FoodItemAdmin> {
    return this.http.post<FoodItemAdmin>(`${this.apiUrl}/menu/branches/${branchId}/categories/${categoryId}/items`, item);
  }

  updateFoodItem(itemId: number, item: Partial<FoodItemAdmin>): Observable<FoodItemAdmin> {
    return this.http.put<FoodItemAdmin>(`${this.apiUrl}/menu/items/${itemId}`, item);
  }

  deleteFoodItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/menu/items/${itemId}`);
  }

  // --- Inventory Management APIs ---
  getInventoryCategories(branchId: number): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(`${this.apiUrl}/inventory/branches/${branchId}/categories`);
  }

  addInventoryCategory(branchId: number, category: Partial<InventoryCategory>): Observable<InventoryCategory> {
    return this.http.post<InventoryCategory>(`${this.apiUrl}/inventory/branches/${branchId}/categories`, category);
  }

  updateInventoryCategory(categoryId: number, category: Partial<InventoryCategory>): Observable<InventoryCategory> {
    return this.http.put<InventoryCategory>(`${this.apiUrl}/inventory/categories/${categoryId}`, category);
  }

  deleteInventoryCategory(categoryId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/inventory/categories/${categoryId}`);
  }

  getInventoryItems(branchId: number): Observable<InventoryItemAdmin[]> {
    return this.http.get<InventoryItemAdmin[]>(`${this.apiUrl}/inventory/branches/${branchId}/items`);
  }

  addInventoryItem(branchId: number, categoryId: number, item: Partial<InventoryItemAdmin>): Observable<InventoryItemAdmin> {
    return this.http.post<InventoryItemAdmin>(`${this.apiUrl}/inventory/branches/${branchId}/categories/${categoryId}/items`, item);
  }

  updateInventoryItem(itemId: number, item: Partial<InventoryItemAdmin>): Observable<InventoryItemAdmin> {
    return this.http.put<InventoryItemAdmin>(`${this.apiUrl}/inventory/items/${itemId}`, item);
  }

  deleteInventoryItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/inventory/items/${itemId}`);
  }

  getLowStockItems(branchId: number): Observable<InventoryItemAdmin[]> {
    return this.http.get<InventoryItemAdmin[]>(`${this.apiUrl}/inventory/branches/${branchId}/low-stock`);
  }

  adjustStock(itemId: number, adjustment: StockAdjustment): Observable<InventoryItemAdmin> {
    return this.http.post<InventoryItemAdmin>(`${this.apiUrl}/inventory/items/${itemId}/stock`, adjustment);
  }

  getInventoryTransactions(branchId: number): Observable<InventoryTransaction[]> {
    return this.http.get<InventoryTransaction[]>(`${this.apiUrl}/inventory/branches/${branchId}/transactions`);
  }

  // --- Table & Reservation Management APIs ---
  getTables(branchId: number): Observable<TableAdmin[]> {
    return this.http.get<TableAdmin[]>(`${this.apiUrl}/tables/branches/${branchId}`);
  }

  addTable(branchId: number, table: Partial<TableAdmin>): Observable<TableAdmin> {
    return this.http.post<TableAdmin>(`${this.apiUrl}/tables/branches/${branchId}`, table);
  }

  updateTable(tableId: number, table: Partial<TableAdmin>): Observable<TableAdmin> {
    return this.http.put<TableAdmin>(`${this.apiUrl}/tables/${tableId}`, table);
  }

  deleteTable(tableId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tables/${tableId}`);
  }

  getReservations(branchId: number): Observable<ReservationAdmin[]> {
    return this.http.get<ReservationAdmin[]>(`${this.apiUrl}/reservations/branches/${branchId}`);
  }

  updateReservationStatus(reservationId: number, status: string): Observable<ReservationAdmin> {
    return this.http.patch<ReservationAdmin>(`${this.apiUrl}/reservations/${reservationId}/status?status=${status}`, {});
  }

  // --- Phase 7 User & Order & Report APIs ---
  getAllUsers(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/admin/users`);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${id}`);
  }

  getAllAdminOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/orders`);
  }

  getReports(branchId?: number): Observable<ReportData> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<ReportData>(`${this.apiUrl}/admin/dashboard/reports`, { params });
  }
}

export interface BranchSalesSummary {
  branchId: number;
  branchName: string;
  orderCount: number;
  totalSales: number;
}

export interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  ordersByType: { [key: string]: number };
  ordersByStatus: { [key: string]: number };
  reservationsByStatus: { [key: string]: number };
  totalInventoryItems: number;
  lowStockCount: number;
  branchSalesSummaries: BranchSalesSummary[];
}
