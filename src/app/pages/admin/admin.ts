import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  AdminService, 
  Reservation, 
  User, 
  RestaurantTable, 
  MenuItem, 
  Review, 
  SystemNotification 
} from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent {
  protected adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Tab State
  activeTab = 'dashboard';

  // Search & Filter state
  searchReservationQuery = '';
  filterReservationStatus = '';
  filterReservationDate = '';

  searchUserQuery = '';
  filterUserStatus = '';

  searchTableQuery = '';
  filterTableStatus = '';

  searchMenuQuery = '';
  filterMenuCategory = '';

  // Modals state
  isTableModalOpen = false;
  editingTable: RestaurantTable | null = null;
  tableForm = {
    name: '',
    capacity: 2,
    status: 'Available' as 'Available' | 'Reserved' | 'Occupied',
    location: 'Main Hall' as 'Main Hall' | 'Terrace' | 'VIP'
  };

  isMenuModalOpen = false;
  editingMenuItem: MenuItem | null = null;
  menuForm = {
    name: '',
    description: '',
    price: 0,
    category: 'Appetizers' as 'Appetizers' | 'Main Course' | 'Desserts' | 'Beverages',
    imageUrl: '',
    available: true
  };

  isReservationModalOpen = false;
  editingReservation: Reservation | null = null;
  reservationForm = {
    customerName: '',
    customerEmail: '',
    phone: '',
    date: '',
    time: '',
    guests: 2,
    tableId: '',
    status: 'Pending' as 'Pending' | 'Confirmed' | 'Cancelled' | 'Rejected',
    notes: ''
  };

  // Delete Confirm Modal
  isDeleteConfirmOpen = false;
  deleteTargetType: 'user' | 'table' | 'menu' | 'review' | null = null;
  deleteTargetId = '';
  deleteTargetName = '';

  // Notifications dropdown toggle
  isNotificationsOpen = false;

  // Profile Form state
  adminProfile = {
    name: 'Admin Chef',
    email: 'admin1@gmail.com',
    password: '',
    newPassword: '',
    confirmPassword: ''
  };
  profileSuccessMsg = '';
  profileErrorMsg = '';

  // Standard food images for selection convenience
  defaultFoodImages = [
    { name: 'Appetizer/Fry', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600' },
    { name: 'Parotta/Bread', url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600' },
    { name: 'Curry/Main', url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600' },
    { name: 'Pudding/Dessert', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600' },
    { name: 'Cooler/Beverage', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600' },
    { name: 'Burger/Snack', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' }
  ];

  constructor() {
    // Sync email from logged in state if available
    const role = localStorage.getItem('userRole');
    // Check local storage for actual user role or name if we want to customize it
  }

  // --- TAB SWAPPING ---
  selectTab(tab: string): void {
    this.activeTab = tab;
    this.isNotificationsOpen = false;
    this.resetAlerts();
  }

  resetAlerts(): void {
    this.profileSuccessMsg = '';
    this.profileErrorMsg = '';
  }

  // --- FILTERED DATA GETTERS ---
  get filteredReservations(): Reservation[] {
    const query = this.searchReservationQuery.trim().toLowerCase();
    const status = this.filterReservationStatus;
    const date = this.filterReservationDate;

    return this.adminService.reservations().filter(res => {
      const matchesQuery = !query || 
        res.customerName.toLowerCase().includes(query) || 
        res.customerEmail.toLowerCase().includes(query) || 
        res.id.toLowerCase().includes(query);
      const matchesStatus = !status || res.status === status;
      const matchesDate = !date || res.date === date;
      return matchesQuery && matchesStatus && matchesDate;
    });
  }

  get filteredUsers(): User[] {
    const query = this.searchUserQuery.trim().toLowerCase();
    const status = this.filterUserStatus;

    return this.adminService.users().filter(user => {
      const matchesQuery = !query || 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query);
      const matchesStatus = !status || user.status === status;
      return matchesQuery && matchesStatus;
    });
  }

  get filteredTables(): RestaurantTable[] {
    const query = this.searchTableQuery.trim().toLowerCase();
    const status = this.filterTableStatus;

    return this.adminService.tables().filter(t => {
      const matchesQuery = !query || t.name.toLowerCase().includes(query) || t.location.toLowerCase().includes(query);
      const matchesStatus = !status || t.status === status;
      return matchesQuery && matchesStatus;
    });
  }

  get filteredMenuItems(): MenuItem[] {
    const query = this.searchMenuQuery.trim().toLowerCase();
    const category = this.filterMenuCategory;

    return this.adminService.menuItems().filter(item => {
      const matchesQuery = !query || 
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query);
      const matchesCategory = !category || item.category === category;
      return matchesQuery && matchesCategory;
    });
  }

  get unreadNotificationsCount(): number {
    return this.adminService.notifications().filter(n => !n.read).length;
  }

  // --- RESERVATION OPERATIONS ---
  confirmReservation(id: string): void {
    this.adminService.updateReservationStatus(id, 'Confirmed');
  }

  rejectReservation(id: string): void {
    this.adminService.updateReservationStatus(id, 'Rejected');
  }

  cancelReservation(id: string): void {
    this.adminService.updateReservationStatus(id, 'Cancelled');
  }

  openEditReservationModal(res: Reservation): void {
    this.editingReservation = res;
    this.reservationForm = {
      customerName: res.customerName,
      customerEmail: res.customerEmail,
      phone: res.phone,
      date: res.date,
      time: res.time,
      guests: res.guests,
      tableId: res.tableId,
      status: res.status,
      notes: res.notes
    };
    this.isReservationModalOpen = true;
  }

  closeReservationModal(): void {
    this.isReservationModalOpen = false;
    this.editingReservation = null;
  }

  saveReservation(): void {
    if (!this.reservationForm.customerName || !this.reservationForm.date || !this.reservationForm.time) {
      return;
    }

    if (this.editingReservation) {
      const updatedRes: Reservation = {
        ...this.editingReservation,
        customerName: this.reservationForm.customerName,
        customerEmail: this.reservationForm.customerEmail,
        phone: this.reservationForm.phone,
        date: this.reservationForm.date,
        time: this.reservationForm.time,
        guests: this.reservationForm.guests,
        tableId: this.reservationForm.tableId,
        status: this.reservationForm.status,
        notes: this.reservationForm.notes
      };
      this.adminService.updateReservation(updatedRes);
    } else {
      this.adminService.addReservation({
        customerName: this.reservationForm.customerName,
        customerEmail: this.reservationForm.customerEmail,
        phone: this.reservationForm.phone,
        date: this.reservationForm.date,
        time: this.reservationForm.time,
        guests: this.reservationForm.guests,
        tableId: this.reservationForm.tableId,
        status: this.reservationForm.status,
        notes: this.reservationForm.notes
      });
    }

    this.closeReservationModal();
  }

  // --- TABLE OPERATIONS ---
  openAddTableModal(): void {
    this.editingTable = null;
    this.tableForm = {
      name: 'Table ' + (this.adminService.tables().length + 1),
      capacity: 4,
      status: 'Available',
      location: 'Main Hall'
    };
    this.isTableModalOpen = true;
  }

  openEditTableModal(table: RestaurantTable): void {
    this.editingTable = table;
    this.tableForm = {
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      location: table.location
    };
    this.isTableModalOpen = true;
  }

  closeTableModal(): void {
    this.isTableModalOpen = false;
    this.editingTable = null;
  }

  saveTable(): void {
    if (!this.tableForm.name || !this.tableForm.capacity) {
      return;
    }

    if (this.editingTable) {
      const updated: RestaurantTable = {
        ...this.editingTable,
        name: this.tableForm.name,
        capacity: this.tableForm.capacity,
        status: this.tableForm.status,
        location: this.tableForm.location
      };
      this.adminService.updateTable(updated);
    } else {
      this.adminService.addTable({
        name: this.tableForm.name,
        capacity: this.tableForm.capacity,
        status: this.tableForm.status,
        location: this.tableForm.location
      });
    }

    this.closeTableModal();
  }

  // --- MENU ITEM OPERATIONS ---
  openAddMenuModal(): void {
    this.editingMenuItem = null;
    this.menuForm = {
      name: '',
      description: '',
      price: 150,
      category: 'Main Course',
      imageUrl: this.defaultFoodImages[0].url,
      available: true
    };
    this.isMenuModalOpen = true;
  }

  openEditMenuModal(item: MenuItem): void {
    this.editingMenuItem = item;
    this.menuForm = {
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      available: item.available
    };
    this.isMenuModalOpen = true;
  }

  closeMenuModal(): void {
    this.isMenuModalOpen = false;
    this.editingMenuItem = null;
  }

  saveMenuItem(): void {
    if (!this.menuForm.name || !this.menuForm.price) {
      return;
    }

    if (this.editingMenuItem) {
      const updated: MenuItem = {
        ...this.editingMenuItem,
        name: this.menuForm.name,
        description: this.menuForm.description,
        price: this.menuForm.price,
        category: this.menuForm.category,
        imageUrl: this.menuForm.imageUrl,
        available: this.menuForm.available
      };
      this.adminService.updateMenuItem(updated);
    } else {
      this.adminService.addMenuItem({
        name: this.menuForm.name,
        description: this.menuForm.description,
        price: this.menuForm.price,
        category: this.menuForm.category,
        imageUrl: this.menuForm.imageUrl,
        available: this.menuForm.available
      });
    }

    this.closeMenuModal();
  }

  toggleMenuItemAvailability(item: MenuItem): void {
    const updated = { ...item, available: !item.available };
    this.adminService.updateMenuItem(updated);
  }

  selectDefaultImage(url: string): void {
    this.menuForm.imageUrl = url;
  }

  // --- DYNAMIC NOTIFICATIONS PANEL ---
  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  markAllNotificationsRead(): void {
    this.adminService.markAllAsRead();
  }

  clearAllNotifications(): void {
    this.adminService.clearAllNotifications();
  }

  // --- DELETE CONFIRMATION SYSTEM ---
  openDeleteConfirm(type: 'user' | 'table' | 'menu' | 'review', id: string, name: string): void {
    this.deleteTargetType = type;
    this.deleteTargetId = id;
    this.deleteTargetName = name;
    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm(): void {
    this.isDeleteConfirmOpen = false;
    this.deleteTargetType = null;
    this.deleteTargetId = '';
    this.deleteTargetName = '';
  }

  confirmDelete(): void {
    if (!this.deleteTargetType || !this.deleteTargetId) return;

    switch (this.deleteTargetType) {
      case 'user':
        this.adminService.deleteUser(this.deleteTargetId);
        break;
      case 'table':
        this.adminService.deleteTable(this.deleteTargetId);
        break;
      case 'menu':
        this.adminService.deleteMenuItem(this.deleteTargetId);
        break;
      case 'review':
        this.adminService.deleteReview(this.deleteTargetId);
        break;
    }

    this.closeDeleteConfirm();
  }

  // --- USER TOGGLES ---
  toggleUserStatus(id: string): void {
    this.adminService.toggleUserStatus(id);
  }

  // --- SETTINGS MANAGEMENT ---
  saveProfile(): void {
    this.resetAlerts();
    if (!this.adminProfile.name || !this.adminProfile.email) {
      this.profileErrorMsg = 'Name and email are required fields.';
      return;
    }

    this.profileSuccessMsg = 'Admin Profile settings updated successfully!';
  }

  changePassword(): void {
    this.resetAlerts();
    if (!this.adminProfile.password || !this.adminProfile.newPassword || !this.adminProfile.confirmPassword) {
      this.profileErrorMsg = 'Please fill out all password fields.';
      return;
    }

    if (this.adminProfile.newPassword !== this.adminProfile.confirmPassword) {
      this.profileErrorMsg = 'New password and confirmation password do not match.';
      return;
    }

    this.profileSuccessMsg = 'Password changed successfully!';
    // Clear values
    this.adminProfile.password = '';
    this.adminProfile.newPassword = '';
    this.adminProfile.confirmPassword = '';
  }

  // --- SECURE LOGOUT ---
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
