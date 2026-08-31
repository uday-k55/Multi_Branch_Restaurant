import { Injectable, signal } from '@angular/core';

export interface Reservation {
  id: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  tableId: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Rejected';
  notes: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  joinedDate: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  status: 'Available' | 'Reserved' | 'Occupied';
  location: 'Main Hall' | 'Terrace' | 'VIP';
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Appetizers' | 'Main Course' | 'Desserts' | 'Beverages';
  imageUrl: string;
  available: boolean;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // Signals for state management
  reservations = signal<Reservation[]>([]);
  users = signal<User[]>([]);
  tables = signal<RestaurantTable[]>([]);
  menuItems = signal<MenuItem[]>([]);
  reviews = signal<Review[]>([]);
  notifications = signal<SystemNotification[]>([]);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // 1. Load or seed tables
    const storedTables = localStorage.getItem('admin_tables');
    if (storedTables) {
      this.tables.set(JSON.parse(storedTables));
    } else {
      const defaultTables: RestaurantTable[] = [
        { id: 'T1', name: 'Table 1', capacity: 2, status: 'Available', location: 'Main Hall' },
        { id: 'T2', name: 'Table 2', capacity: 4, status: 'Occupied', location: 'Main Hall' },
        { id: 'T3', name: 'Table 3', capacity: 4, status: 'Available', location: 'Main Hall' },
        { id: 'T4', name: 'Table 4', capacity: 6, status: 'Reserved', location: 'Terrace' },
        { id: 'T5', name: 'Table 5', capacity: 2, status: 'Available', location: 'Terrace' },
        { id: 'T6', name: 'Table 6', capacity: 8, status: 'Available', location: 'VIP' },
        { id: 'T7', name: 'Table 7', capacity: 4, status: 'Occupied', location: 'VIP' },
        { id: 'T8', name: 'Table 8', capacity: 2, status: 'Available', location: 'Terrace' }
      ];
      this.saveAndSetTables(defaultTables);
    }

    // 2. Load or seed menu items
    const storedMenu = localStorage.getItem('admin_menu');
    if (storedMenu) {
      this.menuItems.set(JSON.parse(storedMenu));
    } else {
      const defaultMenu: MenuItem[] = [
        { id: 'M1', name: 'Kottayam Beef Fry (Ularthiyathu)', description: 'Slow roasted beef chunks with coconut slices, ginger, garlic, and freshly crushed spices.', price: 280, category: 'Main Course', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', available: true },
        { id: 'M2', name: 'Kerala Parotta (3 Pcs)', description: 'Layered, flaky flatbread made from refined flour, perfect companion for beef curry.', price: 60, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', available: true },
        { id: 'M3', name: 'Chef Special Beef Curry', description: 'Rich spicy gravy featuring tender beef slow-cooked in roasted coconut paste.', price: 310, category: 'Main Course', imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600', available: true },
        { id: 'M4', name: 'Tender Coconut Pudding', description: 'Silky smooth pudding made with fresh tender coconut pulp and milk.', price: 120, category: 'Desserts', imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600', available: true },
        { id: 'M5', name: 'Lime Mint Cooler', description: 'Refreshing summer drink with fresh lime juice, mint leaves, and a dash of soda.', price: 80, category: 'Beverages', imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600', available: true },
        { id: 'M6', name: 'Beef Cutlet (4 Pcs)', description: 'Crispy breaded patties stuffed with spiced minced beef and mashed potatoes.', price: 150, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600', available: true }
      ];
      this.saveAndSetMenu(defaultMenu);
    }

    // 3. Load or seed users
    const storedUsers = localStorage.getItem('admin_users');
    if (storedUsers) {
      this.users.set(JSON.parse(storedUsers));
    } else {
      const defaultUsers: User[] = [
        { id: 'U1', name: 'Anjali Nair', email: 'anjali@gmail.com', phone: '+91 9447123456', status: 'Active', joinedDate: '2026-08-10' },
        { id: 'U2', name: 'Rahul Sharma', email: 'rahul.s@gmail.com', phone: '+91 9846123987', status: 'Active', joinedDate: '2026-08-15' },
        { id: 'U3', name: 'Melbin Joseph', email: 'melbin.j@gmail.com', phone: '+91 9744112233', status: 'Active', joinedDate: '2026-08-20' },
        { id: 'U4', name: 'Sneha Kurian', email: 'sneha.k@gmail.com', phone: '+91 9961456789', status: 'Inactive', joinedDate: '2026-08-22' },
        { id: 'U5', name: 'John Doe', email: 'john.doe@gmail.com', phone: '+1 555-0199', status: 'Active', joinedDate: '2026-08-25' }
      ];
      this.saveAndSetUsers(defaultUsers);
    }

    // 4. Load or seed reservations
    const storedReservations = localStorage.getItem('admin_reservations');
    if (storedReservations) {
      this.reservations.set(JSON.parse(storedReservations));
    } else {
      const defaultReservations: Reservation[] = [
        { id: 'R1', customerName: 'Anjali Nair', customerEmail: 'anjali@gmail.com', phone: '+91 9447123456', date: '2026-08-31', time: '19:30', guests: 2, tableId: 'T1', status: 'Confirmed', notes: 'Window seat if possible.' },
        { id: 'R2', customerName: 'Rahul Sharma', customerEmail: 'rahul.s@gmail.com', phone: '+91 9846123987', date: '2026-09-01', time: '20:00', guests: 4, tableId: 'T3', status: 'Pending', notes: 'Celebrating anniversary.' },
        { id: 'R3', customerName: 'Melbin Joseph', customerEmail: 'melbin.j@gmail.com', phone: '+91 9744112233', date: '2026-08-30', time: '13:00', guests: 4, tableId: 'T2', status: 'Confirmed', notes: '' },
        { id: 'R4', customerName: 'Sneha Kurian', customerEmail: 'sneha.k@gmail.com', phone: '+91 9961456789', date: '2026-08-28', time: '21:00', guests: 6, tableId: 'T4', status: 'Cancelled', notes: 'Needed to reschedule.' },
        { id: 'R5', customerName: 'Anoop Krishnan', customerEmail: 'anoop.k@gmail.com', phone: '+91 9562778899', date: '2026-09-02', time: '19:00', guests: 8, tableId: 'T6', status: 'Pending', notes: 'Need space for wheelchair access.' },
        { id: 'R6', customerName: 'Maria Thomas', customerEmail: 'maria.t@gmail.com', phone: '+91 9895112244', date: '2026-08-25', time: '12:30', guests: 2, tableId: 'T5', status: 'Rejected', notes: 'Overbooked time slot.' }
      ];
      this.saveAndSetReservations(defaultReservations);
    }

    // 5. Load or seed reviews
    const storedReviews = localStorage.getItem('admin_reviews');
    if (storedReviews) {
      this.reviews.set(JSON.parse(storedReviews));
    } else {
      const defaultReviews: Review[] = [
        { id: 'Rev1', customerName: 'Anjali Nair', rating: 5, comment: 'The Kottayam beef fry is absolute heaven! Flaky parottas and great service.', date: '2026-08-28' },
        { id: 'Rev2', customerName: 'John Doe', rating: 4, comment: 'Very pleasant atmosphere. Beef curry was delicious, but a bit too spicy for my taste.', date: '2026-08-27' },
        { id: 'Rev3', customerName: 'Melbin Joseph', rating: 5, comment: 'Outstanding hospitality. Table ordering QR system makes the ordering process incredibly seamless.', date: '2026-08-29' }
      ];
      this.saveAndSetReviews(defaultReviews);
    }

    // 6. Load or seed notifications
    const storedNotifications = localStorage.getItem('admin_notifications');
    if (storedNotifications) {
      this.notifications.set(JSON.parse(storedNotifications));
    } else {
      const defaultNotifications: SystemNotification[] = [
        { id: 'N1', message: 'New pending reservation request from Rahul Sharma for Sept 1st.', type: 'warning', timestamp: '2026-08-30 18:30', read: false },
        { id: 'N2', message: 'Customer account created for John Doe.', type: 'success', timestamp: '2026-08-30 14:15', read: false },
        { id: 'N3', message: 'Reservation R4 cancelled by Sneha Kurian.', type: 'danger', timestamp: '2026-08-29 11:00', read: true },
        { id: 'N4', message: 'System Backup completed successfully.', type: 'info', timestamp: '2026-08-30 00:00', read: true }
      ];
      this.saveAndSetNotifications(defaultNotifications);
    }
  }

  // --- PERSISTENCE HELPERS ---
  private saveAndSetReservations(data: Reservation[]): void {
    localStorage.setItem('admin_reservations', JSON.stringify(data));
    this.reservations.set(data);
  }

  private saveAndSetUsers(data: User[]): void {
    localStorage.setItem('admin_users', JSON.stringify(data));
    this.users.set(data);
  }

  private saveAndSetTables(data: RestaurantTable[]): void {
    localStorage.setItem('admin_tables', JSON.stringify(data));
    this.tables.set(data);
  }

  private saveAndSetMenu(data: MenuItem[]): void {
    localStorage.setItem('admin_menu', JSON.stringify(data));
    this.menuItems.set(data);
  }

  private saveAndSetReviews(data: Review[]): void {
    localStorage.setItem('admin_reviews', JSON.stringify(data));
    this.reviews.set(data);
  }

  private saveAndSetNotifications(data: SystemNotification[]): void {
    localStorage.setItem('admin_notifications', JSON.stringify(data));
    this.notifications.set(data);
  }

  // --- RESERVATION OPERATIONS ---
  updateReservationStatus(id: string, status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Rejected'): void {
    const list = this.reservations().map(r => {
      if (r.id === id) {
        const updated = { ...r, status };
        
        this.addNotification(`Reservation ${id} status updated to ${status} for ${r.customerName}.`, 
          status === 'Confirmed' ? 'success' : status === 'Cancelled' ? 'danger' : 'info'
        );

        return updated;
      }
      return r;
    });
    this.saveAndSetReservations(list);
  }

  addReservation(res: Omit<Reservation, 'id'>): void {
    const newId = 'R' + (Math.max(...this.reservations().map(r => parseInt(r.id.substring(1)) || 0), 0) + 1);
    const newRes: Reservation = {
      ...res,
      id: newId
    };
    const list = [newRes, ...this.reservations()];
    this.saveAndSetReservations(list);
    this.addNotification(`New reservation booking created for ${res.customerName}.`, 'warning');
  }

  updateReservation(updatedRes: Reservation): void {
    const list = this.reservations().map(r => r.id === updatedRes.id ? updatedRes : r);
    this.saveAndSetReservations(list);
    this.addNotification(`Reservation details modified for ${updatedRes.customerName}.`, 'info');
  }

  // --- USER OPERATIONS ---
  toggleUserStatus(id: string): void {
    const list = this.users().map(u => {
      if (u.id === id) {
        const newStatus: 'Active' | 'Inactive' = u.status === 'Active' ? 'Inactive' : 'Active';
        this.addNotification(`User ${u.name} account is now ${newStatus}.`, 'info');
        return { ...u, status: newStatus };
      }
      return u;
    });
    this.saveAndSetUsers(list);
  }

  deleteUser(id: string): void {
    const user = this.users().find(u => u.id === id);
    const list = this.users().filter(u => u.id !== id);
    this.saveAndSetUsers(list);
    if (user) {
      this.addNotification(`Customer account for ${user.name} was deleted.`, 'danger');
    }
  }

  // --- TABLE OPERATIONS ---
  addTable(table: Omit<RestaurantTable, 'id'>): void {
    const newId = 'T' + (Math.max(...this.tables().map(t => parseInt(t.id.substring(1)) || 0), 0) + 1);
    const newTable: RestaurantTable = {
      ...table,
      id: newId
    };
    const list = [...this.tables(), newTable];
    this.saveAndSetTables(list);
    this.addNotification(`Restaurant ${table.name} in ${table.location} was added.`, 'success');
  }

  updateTable(updatedTable: RestaurantTable): void {
    const list = this.tables().map(t => t.id === updatedTable.id ? updatedTable : t);
    this.saveAndSetTables(list);
  }

  deleteTable(id: string): void {
    const table = this.tables().find(t => t.id === id);
    const list = this.tables().filter(t => t.id !== id);
    this.saveAndSetTables(list);
    if (table) {
      this.addNotification(`Restaurant table ${table.name} was removed.`, 'danger');
    }
  }

  // --- MENU OPERATIONS ---
  addMenuItem(item: Omit<MenuItem, 'id'>): void {
    const newId = 'M' + (Math.max(...this.menuItems().map(m => parseInt(m.id.substring(1)) || 0), 0) + 1);
    const newItem: MenuItem = {
      ...item,
      id: newId
    };
    const list = [...this.menuItems(), newItem];
    this.saveAndSetMenu(list);
    this.addNotification(`New menu item "${item.name}" added under ${item.category}.`, 'success');
  }

  updateMenuItem(updatedItem: MenuItem): void {
    const list = this.menuItems().map(m => m.id === updatedItem.id ? updatedItem : m);
    this.saveAndSetMenu(list);
  }

  deleteMenuItem(id: string): void {
    const item = this.menuItems().find(m => m.id === id);
    const list = this.menuItems().filter(m => m.id !== id);
    this.saveAndSetMenu(list);
    if (item) {
      this.addNotification(`Menu item "${item.name}" was deleted.`, 'danger');
    }
  }

  // --- REVIEWS OPERATIONS ---
  deleteReview(id: string): void {
    const list = this.reviews().filter(r => r.id !== id);
    this.saveAndSetReviews(list);
    this.addNotification(`Review reference ${id} was deleted by Admin.`, 'info');
  }

  // --- NOTIFICATIONS OPERATIONS ---
  addNotification(message: string, type: 'info' | 'warning' | 'success' | 'danger' = 'info'): void {
    const date = new Date();
    const formattedDate = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0') + ' ' + 
      String(date.getHours()).padStart(2, '0') + ':' + 
      String(date.getMinutes()).padStart(2, '0');

    const newId = 'N' + (Math.max(...this.notifications().map(n => parseInt(n.id.substring(1)) || 0), 0) + 1);
    const newNotif: SystemNotification = {
      id: newId,
      message,
      type,
      timestamp: formattedDate,
      read: false
    };
    const list = [newNotif, ...this.notifications()];
    this.saveAndSetNotifications(list);
  }

  markAllAsRead(): void {
    const list = this.notifications().map(n => ({ ...n, read: true }));
    this.saveAndSetNotifications(list);
  }

  clearAllNotifications(): void {
    this.saveAndSetNotifications([]);
  }

  // --- STATS HELPER ---
  getStats() {
    const bookings = this.reservations();
    const activeTables = this.tables();
    const registeredUsers = this.users();

    return {
      totalUsers: registeredUsers.length,
      totalReservations: bookings.length,
      pendingReservations: bookings.filter(r => r.status === 'Pending').length,
      confirmedReservations: bookings.filter(r => r.status === 'Confirmed').length,
      cancelledReservations: bookings.filter(r => r.status === 'Cancelled').length,
      rejectedReservations: bookings.filter(r => r.status === 'Rejected').length,
      availableTables: activeTables.filter(t => t.status === 'Available').length,
      totalTables: activeTables.length,
      occupiedTables: activeTables.filter(t => t.status === 'Occupied').length
    };
  }
}
