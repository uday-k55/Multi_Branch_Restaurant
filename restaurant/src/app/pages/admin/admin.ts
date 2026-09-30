import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  AdminService, DashboardStats, Employee, CreateEmployeeRequest,
  MenuCategory, FoodItemAdmin, InventoryCategory, InventoryItemAdmin,
  InventoryTransaction, StockAdjustment, TableAdmin, ReservationAdmin,
  ReportData, WebsiteImage
} from '../../services/admin.service';
import { Branch } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ThemeService } from '../../services/theme.service';
import { LocationPickerModalComponent, LocationSelectedResult } from '../../components/location-picker-modal/location-picker-modal';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LocationPickerModalComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {
  protected adminService = inject(AdminService);
  protected authService = inject(AuthService);
  protected orderService = inject(OrderService);
  protected themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);
  protected cdr = inject(ChangeDetectorRef);

  activeSection: string = 'dashboard';
  lastAction = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  // Stats
  stats: DashboardStats = {
    totalBranches: 0,
    todaysOrders: 0,
    todaysSales: 0,
    activeEmployees: 0,
    pendingOrders: 0,
    pendingDeliveries: 0,
    totalReservations: 0,
    lowStockItemsCount: 0
  };

  // Sections navigation
  sections = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
    { id: 'users', label: 'Users & Customers', icon: 'fas fa-user-shield' },
    { id: 'branches', label: 'Branches', icon: 'fas fa-store' },
    { id: 'employees', label: 'Employees', icon: 'fas fa-users-cog' },
    { id: 'menu', label: 'Menu', icon: 'fas fa-utensils' },
    { id: 'inventory', label: 'Inventory', icon: 'fas fa-boxes' },
    { id: 'orders', label: 'Orders Management', icon: 'fas fa-receipt' },
    { id: 'reservations', label: 'Reservations & Tables', icon: 'fas fa-calendar-check' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'fas fa-file-invoice-dollar' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  get visibleSections() {
    if (this.authService.isStrictBranchManager()) {
      return this.sections
        .filter(s => s.id !== 'users' && s.id !== 'settings')
        .map(s => s.id === 'branches' ? { ...s, label: 'Branch Details' } : s);
    }
    return this.sections;
  }


  // Modal Loading & Specific Error States
  isBranchSaving = false;
  branchModalError = '';

  isEmployeeSaving = false;
  employeeModalError = '';

  isCategorySaving = false;
  categoryModalError = '';

  isFoodItemSaving = false;
  foodItemModalError = '';

  isInventoryCategorySaving = false;
  inventoryCategoryModalError = '';

  isInventoryItemSaving = false;
  inventoryItemModalError = '';

  isStockAdjustSaving = false;
  stockAdjustModalError = '';

  isTableSaving = false;
  tableModalError = '';

  // Active Selected Branch for branch-scoped management (Menu, Inventory, Tables, Reservations)
  selectedBranchId: number | null = null;

  // Deletion Loading States
  deletingBranchId: number | null = null;
  deletingUserId: number | null = null;
  deletingEmployeeId: number | null = null;

  // Users State
  allUsers: Employee[] = [];
  selectedUserForDetails: Employee | null = null;

  // Orders State
  allOrders: any[] = [];
  orderFilterStatus: string = 'ALL';
  selectedOrderForModal: any = null;

  // Reports State
  reportData: ReportData | null = null;

  // Branches State
  branches: Branch[] = [];
  selectedBranchForDetails: Branch | null = null;
  showBranchModal = false;
  isEditingBranch = false;
  branchForm: Partial<Branch> = {
    name: '',
    state: '',
    district: '',
    address: '',
    phone: '',
    latitude: 0,
    longitude: 0,
    openingHours: '09:00 AM',
    closingHours: '10:00 PM',
    active: true
  };

  // Employees State
  employees: Employee[] = [];
  showEmployeeModal = false;
  isEditingEmployee = false;
  editingEmployeeId: number | null = null;
  employeeForm: CreateEmployeeRequest & { id?: number } = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: 'male',
    password: '',
    role: 'EMPLOYEE',
    branchId: 0
  };

  // --- MENU MANAGEMENT STATE ---
  menuCategories: MenuCategory[] = [];
  foodItems: FoodItemAdmin[] = [];
  showCategoryModal = false;
  isEditingCategory = false;
  editingCategoryId: number | null = null;
  categoryForm: Partial<MenuCategory> = { name: '', description: '' };

  showFoodItemModal = false;
  isEditingFoodItem = false;
  editingFoodItemId: number | null = null;
  foodItemForm: Partial<FoodItemAdmin> = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    categoryId: 0,
    enabled: true,
    isSeasonal: false
  };

  // --- INVENTORY MANAGEMENT STATE ---
  inventoryCategories: InventoryCategory[] = [];
  inventoryItems: InventoryItemAdmin[] = [];
  lowStockItems: InventoryItemAdmin[] = [];
  inventoryTransactions: InventoryTransaction[] = [];
  showInventoryCategoryModal = false;
  inventoryCategoryForm: Partial<InventoryCategory> = { name: '', description: '' };

  showInventoryItemModal = false;
  isEditingInventoryItem = false;
  editingInventoryItemId: number | null = null;
  inventoryItemForm: Partial<InventoryItemAdmin> = {
    name: '',
    categoryId: 0,
    unit: 'KG',
    currentStock: 0,
    minStockThreshold: 5,
    costPerUnit: 0
  };

  showStockAdjustModal = false;
  selectedItemForStock: InventoryItemAdmin | null = null;
  stockAdjustForm: StockAdjustment = {
    quantity: 1,
    transactionType: 'STOCK_IN',
    unitPrice: 0,
    reason: '',
    referenceNumber: ''
  };

  // --- RESERVATIONS & TABLES STATE ---
  tables: TableAdmin[] = [];
  reservations: ReservationAdmin[] = [];
  showTableModal = false;
  isEditingTable = false;
  editingTableId: number | null = null;
  tableForm: Partial<TableAdmin> = {
    tableNumber: '',
    capacity: 4,
    active: true
  };

  ngOnInit(): void {
    this.fetchDashboardStats();
    this.loadBranches();
    this.loadEmployees();
    if (!this.authService.isStrictBranchManager()) {
      this.loadUsersSection();
    }

    this.route.queryParams.subscribe(params => {
      const section = params['section'] || params['tab'];
      if (section) {
        this.setSection(section);
      }
    });
  }

  setSection(sectionId: string): void {
    if (this.authService.isStrictBranchManager() && (sectionId === 'users' || sectionId === 'settings')) {
      this.activeSection = 'dashboard';
      return;
    }
    this.activeSection = sectionId;
    this.clearMessages();
    this.cdr.markForCheck();

    if (sectionId === 'dashboard') {
      this.fetchDashboardStats();
    } else if (sectionId === 'users') {
      this.loadUsersSection();
    } else if (sectionId === 'branches') {
      this.loadBranches();
    } else if (sectionId === 'employees') {
      this.loadEmployees();
      if (this.branches.length === 0) {
        this.adminService.getBranches().subscribe({
          next: (b) => {
            this.branches = b || [];
            this.cdr.markForCheck();
          }
        });
      }
    } else if (sectionId === 'menu') {
      this.initBranchScopedSection(() => this.loadMenuSection());
    } else if (sectionId === 'inventory') {
      this.initBranchScopedSection(() => this.loadInventorySection());
    } else if (sectionId === 'orders') {
      this.initBranchScopedSection(() => this.loadOrdersSection());
    } else if (sectionId === 'reservations' || sectionId === 'tables') {
      this.initBranchScopedSection(() => this.loadReservationsSection());
    } else if (sectionId === 'reports') {
      this.initBranchScopedSection(() => this.loadReportsSection());
    } else if (sectionId === 'settings') {
      this.loadWebsiteImages();
    }
  }


  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  initBranchScopedSection(callback: () => void): void {
    // If Branch Manager, force assigned branch
    if (this.authService.isStrictBranchManager()) {
      this.selectedBranchId = this.authService.getBranchId();
      callback();
      return;
    }

    // If Admin, ensure branch is selected
    if (this.selectedBranchId) {
      callback();
      return;
    }

    if (this.branches.length > 0) {
      this.selectedBranchId = this.branches[0].id;
      callback();
      return;
    }

    // Fetch branches first so selectedBranchId is populated for data queries
    this.adminService.getBranches().subscribe({
      next: (bList) => {
        this.branches = bList || [];
        if (this.branches.length > 0) {
          this.selectedBranchId = this.branches[0].id;
        }
        this.cdr.markForCheck();
        callback();
      },
      error: () => {
        this.cdr.markForCheck();
        callback();
      }
    });
  }

  onScopedBranchChange(branchId: number): void {
    this.selectedBranchId = Number(branchId);
    this.cdr.markForCheck();
    if (this.activeSection === 'menu') {
      this.loadMenuSection();
    } else if (this.activeSection === 'inventory') {
      this.loadInventorySection();
    } else if (this.activeSection === 'reservations' || this.activeSection === 'tables') {
      this.loadReservationsSection();
    } else if (this.activeSection === 'orders') {
      this.loadOrdersSection();
    } else if (this.activeSection === 'reports') {
      this.loadReportsSection();
    }
  }

  // --- STATS ---
  fetchDashboardStats(): void {
    if (this.authService.isStrictBranchManager()) {
      const branchId = this.authService.getBranchId() || this.selectedBranchId;
      if (branchId) {
        this.adminService.getBranchDashboardOverview(branchId).subscribe({
          next: (data) => {
            if (data) {
              this.stats = data;
              this.cdr.markForCheck();
            }
          },
          error: (err) => {
            console.error('Error loading branch dashboard stats:', err);
            this.cdr.markForCheck();
          }
        });
      }
      return;
    }

    this.adminService.getDashboardOverview().subscribe({
      next: (data) => {
        if (data) {
          this.stats = data;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // --- BRANCHES ---
  loadBranches(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getBranches().subscribe({
      next: (data) => {
        let list = data || [];
        if (this.authService.isStrictBranchManager()) {
          const mgrBranchId = this.authService.getBranchId();
          if (mgrBranchId) {
            list = list.filter(b => b.id === mgrBranchId);
          }
          this.selectedBranchId = mgrBranchId;
        }
        this.branches = list;
        if (!this.selectedBranchId && this.branches.length > 0) {
          this.selectedBranchId = this.branches[0].id;
        }
        this.loading = false;
        if (['menu', 'inventory', 'reservations', 'tables', 'orders', 'reports'].includes(this.activeSection)) {
          this.setSection(this.activeSection);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading branches:', err);
        this.cdr.markForCheck();
      }
    });
  }


  openAddBranchModal(): void {
    this.clearMessages();
    this.branchModalError = '';
    this.isBranchSaving = false;
    this.isEditingBranch = false;
    this.branchForm = {
      name: '',
      state: '',
      district: '',
      address: '',
      phone: '',
      latitude: 12.9716,
      longitude: 77.5946,
      openingHours: '09:00 AM',
      closingHours: '10:00 PM',
      active: true
    };
    this.showBranchModal = true;
    this.cdr.markForCheck();
  }

  openEditBranchModal(branch: Branch): void {
    this.clearMessages();
    this.branchModalError = '';
    this.isBranchSaving = false;
    this.isEditingBranch = true;
    this.branchForm = { ...branch };
    this.showBranchModal = true;
    this.cdr.markForCheck();
  }

  closeBranchModal(): void {
    this.showBranchModal = false;
    this.isBranchSaving = false;
    this.branchModalError = '';
    this.showBranchMapPicker = false;
    this.isEditingBranch = false;
    this.branchForm = {
      name: '',
      state: '',
      district: '',
      address: '',
      phone: '',
      latitude: 12.9716,
      longitude: 77.5946,
      openingHours: '09:00 AM',
      closingHours: '10:00 PM',
      active: true
    };
    this.cdr.markForCheck();
  }

  showBranchMapPicker = false;

  openBranchMapPicker(): void {
    this.showBranchMapPicker = true;
    this.cdr.markForCheck();
  }

  closeBranchMapPicker(): void {
    this.showBranchMapPicker = false;
    this.cdr.markForCheck();
  }

  onBranchLocationChosen(result: LocationSelectedResult): void {
    this.showBranchMapPicker = false;
    this.branchForm.latitude = result.lat;
    this.branchForm.longitude = result.lng;
    if (!this.branchForm.address || !this.branchForm.address.trim()) {
      this.branchForm.address = result.address;
    }
    if (result.state && (!this.branchForm.state || !this.branchForm.state.trim())) {
      this.branchForm.state = result.state;
    }
    if (result.district && (!this.branchForm.district || !this.branchForm.district.trim())) {
      this.branchForm.district = result.district;
    }
    this.cdr.markForCheck();
  }

  viewBranchDetails(branch: Branch): void {
    this.selectedBranchForDetails = branch;
    this.cdr.markForCheck();
  }

  closeBranchDetails(): void {
    this.selectedBranchForDetails = null;
    this.cdr.markForCheck();
  }

  saveBranch(): void {
    this.clearMessages();
    if (!this.branchForm.name || !this.branchForm.state || !this.branchForm.district) {
      this.branchModalError = 'Branch Name, State, and District are required.';
      this.cdr.markForCheck();
      return;
    }

    this.isBranchSaving = true;
    this.branchModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingBranch && this.branchForm.id) {
      this.adminService.updateBranch(this.branchForm.id, this.branchForm).subscribe({
        next: (res) => {
          this.isBranchSaving = false;
          this.successMessage = `Branch "${res.name}" updated successfully!`;
          this.closeBranchModal();
          this.loadBranches();
          this.fetchDashboardStats();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isBranchSaving = false;
          this.branchModalError = err.error?.message || 'Failed to update branch.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.createBranch(this.branchForm).subscribe({
        next: (res) => {
          this.isBranchSaving = false;
          this.successMessage = `Branch "${res.name}" created successfully!`;
          this.closeBranchModal();
          this.loadBranches();
          this.fetchDashboardStats();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isBranchSaving = false;
          this.branchModalError = err.error?.message || 'Failed to create branch.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  toggleBranchStatus(branch: Branch): void {
    const newStatus = !branch.active;
    this.adminService.setBranchActiveStatus(branch.id, newStatus).subscribe({
      next: (res) => {
        branch.active = res.active;
        this.successMessage = `Branch "${res.name}" is now ${res.active ? 'Active' : 'Inactive'}.`;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to change branch status.';
        this.cdr.markForCheck();
      }
    });
  }

  deleteBranch(branch: Branch): void {
    if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) return;

    this.clearMessages();
    this.deletingBranchId = branch.id;
    this.cdr.markForCheck();

    this.adminService.deleteBranch(branch.id).subscribe({
      next: () => {
        this.deletingBranchId = null;
        this.successMessage = `Branch "${branch.name}" deleted successfully!`;
        this.loadBranches();
        this.fetchDashboardStats();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deletingBranchId = null;
        this.errorMessage = err.error?.message || `Cannot delete branch "${branch.name}" because existing records depend on it.`;
        this.cdr.markForCheck();
      }
    });
  }

  // --- EMPLOYEES ---
  employeeBranchFilter: string | number = 'ALL';

  loadEmployees(): void {
    this.loading = true;
    this.cdr.markForCheck();

    let branchIdToQuery: number | undefined = undefined;
    if (this.authService.isStrictBranchManager()) {
      branchIdToQuery = this.authService.getBranchId() || undefined;
    } else if (this.employeeBranchFilter !== 'ALL') {
      branchIdToQuery = Number(this.employeeBranchFilter);
    }

    this.adminService.getEmployees(branchIdToQuery).subscribe({
      next: (data) => {
        this.employees = data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading employees:', err);
        this.cdr.markForCheck();
      }
    });
  }

  onEmployeeBranchFilterChange(): void {
    this.loadEmployees();
  }


  getAssignedBranchName(): string {
    const mgrBranchId = this.authService.getBranchId();
    if (this.branches && this.branches.length > 0) {
      const match = this.branches.find(b => b.id === mgrBranchId);
      if (match) {
        return match.name + (match.district ? ` (${match.district})` : '');
      }
      return this.branches[0].name + (this.branches[0].district ? ` (${this.branches[0].district})` : '');
    }
    return mgrBranchId ? `Branch #${mgrBranchId}` : 'Assigned Branch';
  }

  openAddEmployeeModal(defaultRole?: 'BRANCH_MANAGER' | 'CHEF' | 'EMPLOYEE'): void {
    this.clearMessages();
    this.employeeModalError = '';
    this.isEmployeeSaving = false;
    this.isEditingEmployee = false;
    this.editingEmployeeId = null;

    let branchId = 0;
    if (this.authService.isStrictBranchManager()) {
      branchId = this.authService.getBranchId() || (this.branches.length > 0 ? this.branches[0].id : 0);
    } else {
      branchId = this.branches.length > 0 ? this.branches[0].id : 0;
    }

    const selectedRole = this.authService.isStrictBranchManager()
      ? (defaultRole === 'CHEF' ? 'CHEF' : 'EMPLOYEE')
      : (defaultRole || 'EMPLOYEE');

    this.employeeForm = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      gender: 'male',
      password: '',
      role: selectedRole,
      branchId: branchId
    };
    this.showEmployeeModal = true;
    this.cdr.markForCheck();
  }

  openEditEmployeeModal(emp: Employee): void {
    this.clearMessages();
    this.employeeModalError = '';
    this.isEmployeeSaving = false;
    this.isEditingEmployee = true;
    this.editingEmployeeId = emp.id;
    this.employeeForm = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phoneNumber: emp.phoneNumber,
      gender: emp.gender || 'male',
      password: '',
      role: (emp.role === 'ADMIN' ? 'EMPLOYEE' : emp.role) as any,
      branchId: emp.branchId || (this.branches.length > 0 ? this.branches[0].id : 0)
    };
    this.showEmployeeModal = true;
    this.cdr.markForCheck();
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal = false;
    this.isEmployeeSaving = false;
    this.employeeModalError = '';
    this.isEditingEmployee = false;
    this.editingEmployeeId = null;
    const firstBranchId = this.branches.length > 0 ? this.branches[0].id : 0;
    this.employeeForm = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      gender: 'male',
      password: '',
      role: 'EMPLOYEE',
      branchId: firstBranchId
    };
    this.cdr.markForCheck();
  }

  get isEmpMinLength(): boolean {
    return !!this.employeeForm.password && this.employeeForm.password.length >= 4;
  }

  get isEmpMaxLength(): boolean {
    return !!this.employeeForm.password && this.employeeForm.password.length <= 12;
  }

  get hasEmpUppercase(): boolean {
    return /[A-Z]/.test(this.employeeForm.password || '');
  }

  get hasEmpNumber(): boolean {
    return /[0-9]/.test(this.employeeForm.password || '');
  }

  get hasEmpSpecialChar(): boolean {
    return /[^a-zA-Z0-9]/.test(this.employeeForm.password || '');
  }

  get isEmpPasswordValid(): boolean {
    return this.isEmpMinLength && this.isEmpMaxLength && this.hasEmpUppercase && this.hasEmpNumber && this.hasEmpSpecialChar;
  }

  saveEmployee(): void {
    this.clearMessages();
    if (!this.employeeForm.firstName || !/^[a-zA-Z]+$/.test(this.employeeForm.firstName)) {
      this.employeeModalError = 'First name is required and must contain alphabetic characters only.';
      return;
    }

    if (!this.employeeForm.lastName || !/^[a-zA-Z]+$/.test(this.employeeForm.lastName)) {
      this.employeeModalError = 'Last name is required and must contain alphabetic characters only.';
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.employeeForm.email || !emailPattern.test(this.employeeForm.email)) {
      this.employeeModalError = 'Please enter a valid email address.';
      return;
    }

    if (this.employeeForm.phoneNumber && !/^[0-9]{10}$/.test(this.employeeForm.phoneNumber)) {
      this.employeeModalError = 'Phone number must contain exactly 10 digits.';
      return;
    }

    if (!this.isEditingEmployee) {
      if (!this.employeeForm.password) {
        this.employeeModalError = 'Password is required for new employee onboarding.';
        return;
      }
      if (!this.isEmpPasswordValid) {
        this.employeeModalError = 'Password does not meet all required criteria.';
        return;
      }
    } else if (this.employeeForm.password && !this.isEmpPasswordValid) {
      this.employeeModalError = 'Password does not meet all required criteria.';
      return;
    }

    if (this.authService.isStrictBranchManager()) {
      const mgrBranchId = this.authService.getBranchId() || (this.branches.length > 0 ? this.branches[0].id : null);
      if (mgrBranchId) {
        this.employeeForm.branchId = mgrBranchId;
      }
      if (this.employeeForm.role !== 'EMPLOYEE' && this.employeeForm.role !== 'CHEF') {
        this.employeeForm.role = 'EMPLOYEE';
      }
    }

    this.isEmployeeSaving = true;
    this.employeeModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingEmployee && this.editingEmployeeId) {
      this.adminService.updateEmployee(this.editingEmployeeId, this.employeeForm).subscribe({
        next: (res) => {
          this.isEmployeeSaving = false;
          this.successMessage = `Employee "${res.firstName} ${res.lastName}" updated successfully!`;
          this.closeEmployeeModal();
          this.loadEmployees();
          this.fetchDashboardStats();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isEmployeeSaving = false;
          this.employeeModalError = err.error?.message || 'Failed to update employee.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.createEmployee(this.employeeForm).subscribe({
        next: (res) => {
          this.isEmployeeSaving = false;
          this.successMessage = `Employee "${res.firstName} ${res.lastName}" (${res.role}) onboarded successfully!`;
          this.closeEmployeeModal();
          this.loadEmployees();
          this.fetchDashboardStats();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isEmployeeSaving = false;
          this.employeeModalError = err.error?.message || 'Failed to create employee.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteEmployee(emp: Employee): void {
    if (!confirm(`Are you sure you want to delete employee "${emp.firstName} ${emp.lastName}" (${emp.email})?`)) return;

    this.clearMessages();
    this.deletingEmployeeId = emp.id;
    this.cdr.markForCheck();

    this.adminService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.deletingEmployeeId = null;
        this.successMessage = `Employee "${emp.firstName} ${emp.lastName}" removed successfully!`;
        this.loadEmployees();
        this.fetchDashboardStats();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deletingEmployeeId = null;
        this.errorMessage = err.error?.message || `Cannot delete employee "${emp.email}" because existing records depend on this account.`;
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // --- MENU MANAGEMENT ---
  // ==========================================
  loadMenuSection(): void {
    const branchId = this.selectedBranchId || (this.branches.length > 0 ? this.branches[0].id : null);
    if (!branchId) {
      this.initBranchScopedSection(() => this.loadMenuSection());
      return;
    }
    this.selectedBranchId = branchId;
    this.loading = true;
    this.cdr.markForCheck();

    this.adminService.getCategories(branchId).subscribe({
      next: (cats) => {
        this.menuCategories = cats || [];
        this.adminService.getFoodItems(branchId).subscribe({
          next: (items) => {
            this.foodItems = items || [];
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAddCategoryModal(): void {
    this.clearMessages();
    this.categoryModalError = '';
    this.isCategorySaving = false;
    this.isEditingCategory = false;
    this.editingCategoryId = null;
    this.categoryForm = { name: '', description: '' };
    this.showCategoryModal = true;
    this.cdr.markForCheck();
  }

  openEditCategoryModal(cat: MenuCategory): void {
    this.clearMessages();
    this.categoryModalError = '';
    this.isCategorySaving = false;
    this.isEditingCategory = true;
    this.editingCategoryId = cat.id;
    this.categoryForm = { name: cat.name, description: cat.description };
    this.showCategoryModal = true;
    this.cdr.markForCheck();
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.isCategorySaving = false;
    this.categoryModalError = '';
    this.isEditingCategory = false;
    this.editingCategoryId = null;
    this.categoryForm = { name: '', description: '' };
    this.cdr.markForCheck();
  }

  saveCategory(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.categoryForm.name?.trim()) {
      this.categoryModalError = 'Category name is required.';
      this.cdr.markForCheck();
      return;
    }

    this.isCategorySaving = true;
    this.categoryModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingCategory && this.editingCategoryId) {
      this.adminService.updateCategory(this.editingCategoryId, this.categoryForm).subscribe({
        next: () => {
          this.isCategorySaving = false;
          this.successMessage = 'Menu category updated successfully!';
          this.closeCategoryModal();
          this.loadMenuSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCategorySaving = false;
          this.categoryModalError = err.error?.message || 'Failed to update category.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.addCategory(this.selectedBranchId, this.categoryForm).subscribe({
        next: () => {
          this.isCategorySaving = false;
          this.successMessage = 'Menu category created successfully!';
          this.closeCategoryModal();
          this.loadMenuSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCategorySaving = false;
          this.categoryModalError = err.error?.message || 'Failed to create category.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteCategory(cat: MenuCategory): void {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    this.adminService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.successMessage = 'Category deleted successfully!';
        this.loadMenuSection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete category.';
        this.cdr.markForCheck();
      }
    });
  }

  openAddFoodItemModal(): void {
    this.clearMessages();
    this.foodItemModalError = '';
    this.isFoodItemSaving = false;
    this.isEditingFoodItem = false;
    this.editingFoodItemId = null;
    const defaultCatId = this.menuCategories.length > 0 ? this.menuCategories[0].id : 0;

    this.foodItemForm = {
      name: '',
      description: '',
      price: 10.0,
      imageUrl: '',
      categoryId: defaultCatId,
      enabled: true,
      isSeasonal: false
    };
    this.showFoodItemModal = true;
    this.cdr.markForCheck();
  }

  openEditFoodItemModal(item: FoodItemAdmin): void {
    this.clearMessages();
    this.foodItemModalError = '';
    this.isFoodItemSaving = false;
    this.isEditingFoodItem = true;
    this.editingFoodItemId = item.id;
    this.foodItemForm = { ...item };
    this.showFoodItemModal = true;
    this.cdr.markForCheck();
  }

  closeFoodItemModal(): void {
    this.showFoodItemModal = false;
    this.isFoodItemSaving = false;
    this.foodItemModalError = '';
    this.isEditingFoodItem = false;
    this.editingFoodItemId = null;
    const defaultCatId = this.menuCategories.length > 0 ? this.menuCategories[0].id : 0;
    this.foodItemForm = {
      name: '',
      description: '',
      price: 10.0,
      imageUrl: '',
      categoryId: defaultCatId,
      enabled: true,
      isSeasonal: false
    };
    this.cdr.markForCheck();
  }

  saveFoodItem(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.foodItemForm.name?.trim() || !this.foodItemForm.categoryId) {
      this.foodItemModalError = 'Dish Name, Category, and Price are required.';
      this.cdr.markForCheck();
      return;
    }

    this.isFoodItemSaving = true;
    this.foodItemModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingFoodItem && this.editingFoodItemId) {
      this.adminService.updateFoodItem(this.editingFoodItemId, this.foodItemForm).subscribe({
        next: () => {
          this.isFoodItemSaving = false;
          this.successMessage = 'Food item updated successfully!';
          this.closeFoodItemModal();
          this.loadMenuSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isFoodItemSaving = false;
          this.foodItemModalError = err.error?.message || 'Failed to update food item.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.addFoodItem(this.selectedBranchId, this.foodItemForm.categoryId, this.foodItemForm).subscribe({
        next: () => {
          this.isFoodItemSaving = false;
          this.successMessage = 'Food item created successfully!';
          this.closeFoodItemModal();
          this.loadMenuSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isFoodItemSaving = false;
          this.foodItemModalError = err.error?.message || 'Failed to add food item.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  toggleFoodItemStatus(item: FoodItemAdmin): void {
    const updated = { ...item, enabled: !item.enabled };
    this.adminService.updateFoodItem(item.id, updated).subscribe({
      next: () => {
        item.enabled = !item.enabled;
        this.successMessage = `Dish "${item.name}" is now ${item.enabled ? 'Available' : 'Disabled'}.`;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to toggle availability.';
        this.cdr.markForCheck();
      }
    });
  }

  deleteFoodItem(item: FoodItemAdmin): void {
    if (!confirm(`Are you sure you want to delete dish "${item.name}"?`)) return;

    this.adminService.deleteFoodItem(item.id).subscribe({
      next: () => {
        this.successMessage = 'Food item deleted successfully!';
        this.loadMenuSection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete food item.';
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // --- INVENTORY MANAGEMENT ---
  // ==========================================
  loadInventorySection(): void {
    const branchId = this.selectedBranchId || (this.branches.length > 0 ? this.branches[0].id : null);
    if (!branchId) {
      this.initBranchScopedSection(() => this.loadInventorySection());
      return;
    }
    this.selectedBranchId = branchId;
    this.loading = true;
    this.cdr.markForCheck();

    this.adminService.getInventoryCategories(branchId).subscribe({
      next: (cats) => {
        this.inventoryCategories = cats || [];
        this.adminService.getInventoryItems(branchId).subscribe({
          next: (items) => {
            this.inventoryItems = items || [];
            this.adminService.getLowStockItems(branchId).subscribe({
              next: (low) => {
                this.lowStockItems = low || [];
                this.adminService.getInventoryTransactions(branchId).subscribe({
                  next: (txs) => {
                    this.inventoryTransactions = txs || [];
                    this.loading = false;
                    this.cdr.markForCheck();
                  },
                  error: () => {
                    this.loading = false;
                    this.cdr.markForCheck();
                  }
                });
              },
              error: () => {
                this.loading = false;
                this.cdr.markForCheck();
              }
            });
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAddInventoryCategoryModal(): void {
    this.clearMessages();
    this.inventoryCategoryModalError = '';
    this.isInventoryCategorySaving = false;
    this.inventoryCategoryForm = { name: '', description: '' };
    this.showInventoryCategoryModal = true;
    this.cdr.markForCheck();
  }

  closeInventoryCategoryModal(): void {
    this.showInventoryCategoryModal = false;
    this.isInventoryCategorySaving = false;
    this.inventoryCategoryModalError = '';
    this.inventoryCategoryForm = { name: '', description: '' };
    this.cdr.markForCheck();
  }

  saveInventoryCategory(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.inventoryCategoryForm.name?.trim()) {
      this.inventoryCategoryModalError = 'Inventory category name is required.';
      this.cdr.markForCheck();
      return;
    }

    this.isInventoryCategorySaving = true;
    this.inventoryCategoryModalError = '';
    this.cdr.markForCheck();
    this.adminService.addInventoryCategory(this.selectedBranchId, this.inventoryCategoryForm).subscribe({
      next: () => {
        this.isInventoryCategorySaving = false;
        this.successMessage = 'Inventory category created successfully!';
        this.closeInventoryCategoryModal();
        this.loadInventorySection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isInventoryCategorySaving = false;
        this.inventoryCategoryModalError = err.error?.message || 'Failed to create inventory category.';
        this.cdr.markForCheck();
      }
    });
  }

  openAddInventoryItemModal(): void {
    this.clearMessages();
    this.inventoryItemModalError = '';
    this.isInventoryItemSaving = false;
    this.isEditingInventoryItem = false;
    this.editingInventoryItemId = null;
    const defaultCatId = this.inventoryCategories.length > 0 ? this.inventoryCategories[0].id : 0;

    this.inventoryItemForm = {
      name: '',
      categoryId: defaultCatId,
      unit: 'KG',
      currentStock: 0,
      minStockThreshold: 5,
      costPerUnit: 0
    };
    this.showInventoryItemModal = true;
    this.cdr.markForCheck();
  }

  openEditInventoryItemModal(item: InventoryItemAdmin): void {
    this.clearMessages();
    this.inventoryItemModalError = '';
    this.isInventoryItemSaving = false;
    this.isEditingInventoryItem = true;
    this.editingInventoryItemId = item.id;
    this.inventoryItemForm = { ...item };
    this.showInventoryItemModal = true;
    this.cdr.markForCheck();
  }

  closeInventoryItemModal(): void {
    this.showInventoryItemModal = false;
    this.isInventoryItemSaving = false;
    this.inventoryItemModalError = '';
    this.isEditingInventoryItem = false;
    this.editingInventoryItemId = null;
    const defaultCatId = this.inventoryCategories.length > 0 ? this.inventoryCategories[0].id : 0;
    this.inventoryItemForm = {
      name: '',
      categoryId: defaultCatId,
      unit: 'KG',
      currentStock: 0,
      minStockThreshold: 5,
      costPerUnit: 0
    };
    this.cdr.markForCheck();
  }

  saveInventoryItem(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.inventoryItemForm.name?.trim() || !this.inventoryItemForm.categoryId) {
      this.inventoryItemModalError = 'Item Name, Category, and Unit are required.';
      this.cdr.markForCheck();
      return;
    }

    this.isInventoryItemSaving = true;
    this.inventoryItemModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingInventoryItem && this.editingInventoryItemId) {
      this.adminService.updateInventoryItem(this.editingInventoryItemId, this.inventoryItemForm).subscribe({
        next: () => {
          this.isInventoryItemSaving = false;
          this.successMessage = 'Inventory item updated successfully!';
          this.closeInventoryItemModal();
          this.loadInventorySection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isInventoryItemSaving = false;
          this.inventoryItemModalError = err.error?.message || 'Failed to update inventory item.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.addInventoryItem(this.selectedBranchId, this.inventoryItemForm.categoryId, this.inventoryItemForm).subscribe({
        next: () => {
          this.isInventoryItemSaving = false;
          this.successMessage = 'Inventory item created successfully!';
          this.closeInventoryItemModal();
          this.loadInventorySection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isInventoryItemSaving = false;
          this.inventoryItemModalError = err.error?.message || 'Failed to add inventory item.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  openStockAdjustModal(item: InventoryItemAdmin): void {
    this.clearMessages();
    this.stockAdjustModalError = '';
    this.isStockAdjustSaving = false;
    this.selectedItemForStock = item;
    this.stockAdjustForm = {
      quantity: 1,
      transactionType: 'STOCK_IN',
      unitPrice: item.costPerUnit || 0,
      reason: 'Routine Restock',
      referenceNumber: `REC-${Date.now()}`
    };
    this.showStockAdjustModal = true;
    this.cdr.markForCheck();
  }

  closeStockAdjustModal(): void {
    this.showStockAdjustModal = false;
    this.isStockAdjustSaving = false;
    this.stockAdjustModalError = '';
    this.selectedItemForStock = null;
    this.stockAdjustForm = {
      quantity: 1,
      transactionType: 'STOCK_IN',
      unitPrice: 0,
      reason: 'Routine Restock',
      referenceNumber: ''
    };
    this.cdr.markForCheck();
  }

  saveStockAdjustment(): void {
    this.clearMessages();
    if (!this.selectedItemForStock) return;

    this.isStockAdjustSaving = true;
    this.stockAdjustModalError = '';
    this.cdr.markForCheck();
    this.adminService.adjustStock(this.selectedItemForStock.id, this.stockAdjustForm).subscribe({
      next: () => {
        this.isStockAdjustSaving = false;
        this.successMessage = `Stock adjusted for "${this.selectedItemForStock?.name}" (${this.stockAdjustForm.transactionType}: ${this.stockAdjustForm.quantity} ${this.selectedItemForStock?.unit})`;
        this.closeStockAdjustModal();
        this.loadInventorySection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isStockAdjustSaving = false;
        this.stockAdjustModalError = err.error?.message || 'Failed to adjust stock.';
        this.cdr.markForCheck();
      }
    });
  }

  deleteInventoryItem(item: InventoryItemAdmin): void {
    if (!confirm(`Are you sure you want to delete inventory item "${item.name}"?`)) return;

    this.adminService.deleteInventoryItem(item.id).subscribe({
      next: () => {
        this.successMessage = 'Inventory item deleted successfully!';
        this.loadInventorySection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete inventory item.';
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // --- RESERVATIONS & TABLES MANAGEMENT ---
  // ==========================================
  loadReservationsSection(): void {
    const branchId = this.selectedBranchId || (this.branches.length > 0 ? this.branches[0].id : null);
    if (!branchId) {
      this.initBranchScopedSection(() => this.loadReservationsSection());
      return;
    }
    this.selectedBranchId = branchId;
    this.loading = true;
    this.cdr.markForCheck();

    this.adminService.getTables(branchId).subscribe({
      next: (tbls) => {
        this.tables = tbls || [];
        this.adminService.getReservations(branchId).subscribe({
          next: (resList) => {
            this.reservations = resList || [];
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAddTableModal(): void {
    this.clearMessages();
    this.tableModalError = '';
    this.isTableSaving = false;
    this.isEditingTable = false;
    this.editingTableId = null;
    this.tableForm = {
      tableNumber: '',
      capacity: 4,
      active: true
    };
    this.showTableModal = true;
    this.cdr.markForCheck();
  }

  openEditTableModal(table: TableAdmin): void {
    this.clearMessages();
    this.tableModalError = '';
    this.isTableSaving = false;
    this.isEditingTable = true;
    this.editingTableId = table.id;
    this.tableForm = { ...table };
    this.showTableModal = true;
    this.cdr.markForCheck();
  }

  closeTableModal(): void {
    this.showTableModal = false;
    this.isTableSaving = false;
    this.tableModalError = '';
    this.isEditingTable = false;
    this.editingTableId = null;
    this.tableForm = {
      tableNumber: '',
      capacity: 4,
      active: true
    };
    this.cdr.markForCheck();
  }

  saveTable(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.tableForm.tableNumber?.trim()) {
      this.tableModalError = 'Table number is required.';
      this.cdr.markForCheck();
      return;
    }

    this.isTableSaving = true;
    this.tableModalError = '';
    this.cdr.markForCheck();
    if (this.isEditingTable && this.editingTableId) {
      this.adminService.updateTable(this.editingTableId, this.tableForm).subscribe({
        next: () => {
          this.isTableSaving = false;
          this.successMessage = 'Table updated successfully!';
          this.closeTableModal();
          this.loadReservationsSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isTableSaving = false;
          this.tableModalError = err.error?.message || 'Failed to update table.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.addTable(this.selectedBranchId, this.tableForm).subscribe({
        next: () => {
          this.isTableSaving = false;
          this.successMessage = 'Table created successfully!';
          this.closeTableModal();
          this.loadReservationsSection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isTableSaving = false;
          this.tableModalError = err.error?.message || 'Failed to add table.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteTable(table: TableAdmin): void {
    if (!confirm(`Are you sure you want to delete table "${table.tableNumber}"?`)) return;

    this.adminService.deleteTable(table.id).subscribe({
      next: () => {
        this.successMessage = 'Table deleted successfully!';
        this.loadReservationsSection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete table.';
        this.cdr.markForCheck();
      }
    });
  }

  updateReservationStatus(reservationId: number, status: string): void {
    this.adminService.updateReservationStatus(reservationId, status).subscribe({
      next: () => {
        this.successMessage = `Reservation #${reservationId} marked as ${status}.`;
        this.loadReservationsSection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to update reservation status.';
        this.cdr.markForCheck();
      }
    });
  }

  // --- USERS & CUSTOMERS MANAGEMENT ---
  loadUsersSection(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        // Exclusively show CUSTOMER role
        this.allUsers = (users || []).filter(u => u.role === 'CUSTOMER');
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to load customer accounts.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleCustomerBlacklist(u: Employee): void {
    const nextStatus = !u.blacklisted;
    const actionLabel = nextStatus ? 'blacklist' : 'unblacklist';

    this.clearMessages();
    this.deletingUserId = u.id;
    this.cdr.markForCheck();

    this.adminService.setCustomerBlacklistStatus(u.id, nextStatus).subscribe({
      next: (updated) => {
        this.deletingUserId = null;
        u.blacklisted = updated.blacklisted;
        this.successMessage = `Customer "${u.firstName} ${u.lastName}" (${u.email}) has been ${nextStatus ? 'blacklisted' : 'unblacklisted'} successfully.`;
        this.loadUsersSection();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deletingUserId = null;
        this.errorMessage = err.error?.message || `Failed to ${actionLabel} customer account.`;
        this.cdr.markForCheck();
      }
    });
  }


  // --- ORDERS MANAGEMENT ---
  loadOrdersSection(): void {
    this.loading = true;
    this.cdr.markForCheck();
    if (this.authService.userRoleSignal() === 'BRANCH_MANAGER' && this.selectedBranchId) {
      this.orderService.getBranchOrders(this.selectedBranchId).subscribe({
        next: (orders: any[]) => {
          this.allOrders = orders || [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to load branch orders.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.getAllAdminOrders().subscribe({
        next: (orders: any[]) => {
          this.allOrders = orders || [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to load orders.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  get filteredOrders(): any[] {
    if (this.orderFilterStatus === 'ALL') return this.allOrders;
    return this.allOrders.filter(o => o.status === this.orderFilterStatus);
  }

  viewOrderDetailsModal(order: any): void {
    this.selectedOrderForModal = order;
    this.cdr.markForCheck();
  }

  closeOrderDetailsModal(): void {
    this.selectedOrderForModal = null;
    this.cdr.markForCheck();
  }

  // --- REPORTS & ANALYTICS ---
  loadReportsSection(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const branchIdParam = (this.authService.userRoleSignal() === 'BRANCH_MANAGER' || this.selectedBranchId) ? (this.selectedBranchId || undefined) : undefined;
    this.adminService.getReports(branchIdParam).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to load reports.';
        this.cdr.markForCheck();
      }
    });
  }

  onAction(actionType: string): void {
    const formattedActions: { [key: string]: string } = {
      'add-staff': 'Add Staff',
      'add-chef': 'Add Chef',
      'add-branch': 'Add New Branch',
      'add-menu': 'Add New Menu'
    };
    this.lastAction = formattedActions[actionType] || actionType;
    this.cdr.markForCheck();

    if (actionType === 'add-branch') {
      this.setSection('branches');
      this.openAddBranchModal();
    } else if (actionType === 'add-staff') {
      this.setSection('employees');
      this.openAddEmployeeModal('EMPLOYEE');
    } else if (actionType === 'add-chef') {
      this.setSection('employees');
      this.openAddEmployeeModal('CHEF');
    } else if (actionType === 'add-menu') {
      this.setSection('menu');
      this.openAddFoodItemModal();
    }
  }

  // ==========================================
  // WEBSITE IMAGE MANAGEMENT (ADMIN -> SETTINGS -> IMAGE MANAGEMENT)
  // ==========================================
  settingsTab: 'general' | 'images' = 'images';
  websiteImages: WebsiteImage[] = [];
  loadingImages = false;
  isImageModalOpen = false;
  isEditingImage = false;
  editingImageId: number | null = null;
  isImageSaving = false;
  imageModalError = '';
  viewingImage: WebsiteImage | null = null;

  imageForm: {
    page: string;
    section: string;
    title: string;
    imageUrl: string;
    description: string;
  } = {
    page: 'Home',
    section: 'Hero / Carousel',
    title: '',
    imageUrl: '',
    description: ''
  };

  loadWebsiteImages(): void {
    this.loadingImages = true;
    this.cdr.markForCheck();
    this.adminService.getWebsiteImages().subscribe({
      next: (images) => {
        this.websiteImages = images || [];
        this.loadingImages = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadingImages = false;
        console.error('Failed to load website images:', err);
        this.cdr.markForCheck();
      }
    });
  }

  openAddImageModal(): void {
    this.clearMessages();
    this.isEditingImage = false;
    this.editingImageId = null;
    this.imageModalError = '';
    this.isImageSaving = false;
    this.imageForm = {
      page: 'Home',
      section: 'Hero / Carousel',
      title: '',
      imageUrl: '',
      description: ''
    };
    this.isImageModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditImageModal(img: WebsiteImage): void {
    this.clearMessages();
    this.isEditingImage = true;
    this.editingImageId = img.id;
    this.imageModalError = '';
    this.isImageSaving = false;
    this.imageForm = {
      page: img.page,
      section: img.section,
      title: img.title,
      imageUrl: img.imageUrl,
      description: img.description || ''
    };
    this.isImageModalOpen = true;
    this.cdr.markForCheck();
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
    this.editingImageId = null;
    this.imageModalError = '';
    this.cdr.markForCheck();
  }

  saveWebsiteImage(): void {
    this.imageModalError = '';
    if (!this.imageForm.page.trim() || !this.imageForm.section.trim()) {
      this.imageModalError = 'Page and Section association are required.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.imageForm.imageUrl.trim()) {
      this.imageModalError = 'Image URL or file upload is required.';
      this.cdr.markForCheck();
      return;
    }

    this.isImageSaving = true;
    this.cdr.markForCheck();

    const payload = {
      page: this.imageForm.page.trim(),
      section: this.imageForm.section.trim(),
      title: this.imageForm.title.trim() || 'Promotional Image',
      imageUrl: this.imageForm.imageUrl.trim(),
      description: this.imageForm.description.trim()
    };

    if (this.isEditingImage && this.editingImageId) {
      this.adminService.updateWebsiteImage(this.editingImageId, payload).subscribe({
        next: () => {
          this.isImageSaving = false;
          this.isImageModalOpen = false;
          this.successMessage = 'Website image updated successfully.';
          this.loadWebsiteImages();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isImageSaving = false;
          this.imageModalError = err.error?.message || 'Failed to update image.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.addWebsiteImage(payload).subscribe({
        next: () => {
          this.isImageSaving = false;
          this.isImageModalOpen = false;
          this.successMessage = 'New website image added successfully.';
          this.loadWebsiteImages();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isImageSaving = false;
          this.imageModalError = err.error?.message || 'Failed to add image.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteWebsiteImage(img: WebsiteImage): void {
    if (!confirm(`Are you sure you want to delete the image "${img.title}" for ${img.page} (${img.section})?`)) {
      return;
    }

    this.clearMessages();
    this.adminService.deleteWebsiteImage(img.id).subscribe({
      next: () => {
        this.successMessage = `Image "${img.title}" removed successfully.`;
        this.loadWebsiteImages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete image.';
        this.cdr.markForCheck();
      }
    });
  }

  onImageFileChosen(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imageForm.imageUrl = e.target.result;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  openViewImage(img: WebsiteImage): void {
    this.viewingImage = img;
    this.cdr.markForCheck();
  }

  closeViewImage(): void {
    this.viewingImage = null;
    this.cdr.markForCheck();
  }
}

