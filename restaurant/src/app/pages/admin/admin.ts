import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  AdminService, DashboardStats, Employee, CreateEmployeeRequest,
  MenuCategory, FoodItemAdmin, InventoryCategory, InventoryItemAdmin,
  InventoryTransaction, StockAdjustment, TableAdmin, ReservationAdmin,
  ReportData
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
      return this.sections.filter(s => s.id !== 'branches' && s.id !== 'users' && s.id !== 'settings');
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
    this.loadUsersSection();

    this.route.queryParams.subscribe(params => {
      const section = params['section'] || params['tab'];
      if (section) {
        this.setSection(section);
      }
    });
  }

  setSection(sectionId: string): void {
    if (this.authService.isStrictBranchManager() && (sectionId === 'branches' || sectionId === 'users' || sectionId === 'settings')) {
      this.activeSection = 'dashboard';
      return;
    }
    this.activeSection = sectionId;
    this.clearMessages();

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
          next: (b) => { this.branches = b || []; }
        });
      }
    } else if (sectionId === 'menu') {
      this.initBranchScopedSection(() => this.loadMenuSection());
    } else if (sectionId === 'inventory') {
      this.initBranchScopedSection(() => this.loadInventorySection());
    } else if (sectionId === 'orders') {
      this.initBranchScopedSection(() => this.loadOrdersSection());
    } else if (sectionId === 'reservations') {
      this.initBranchScopedSection(() => this.loadReservationsSection());
    } else if (sectionId === 'reports') {
      this.initBranchScopedSection(() => this.loadReportsSection());
    }
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
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
        this.branches = bList;
        if (bList.length > 0) {
          this.selectedBranchId = bList[0].id;
        }
        callback();
      },
      error: () => callback()
    });
  }

  onScopedBranchChange(branchId: number): void {
    this.selectedBranchId = Number(branchId);
    if (this.activeSection === 'menu') {
      this.loadMenuSection();
    } else if (this.activeSection === 'inventory') {
      this.loadInventorySection();
    } else if (this.activeSection === 'reservations') {
      this.loadReservationsSection();
    } else if (this.activeSection === 'orders') {
      this.loadOrdersSection();
    } else if (this.activeSection === 'reports') {
      this.loadReportsSection();
    }
  }

  // --- STATS ---
  fetchDashboardStats(): void {
    this.adminService.getDashboardOverview().subscribe({
      next: (data) => {
        if (data) this.stats = data;
      },
      error: (err) => console.error('Error loading dashboard stats:', err)
    });
  }

  // --- BRANCHES ---
  loadBranches(): void {
    this.loading = true;
    this.adminService.getBranches().subscribe({
      next: (data) => {
        this.branches = data;
        if (!this.selectedBranchId && data.length > 0) {
          this.selectedBranchId = data[0].id;
        }
        this.loading = false;
        if (['menu', 'inventory', 'reservations', 'orders', 'reports'].includes(this.activeSection)) {
          this.setSection(this.activeSection);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading branches:', err);
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
  }

  openEditBranchModal(branch: Branch): void {
    this.clearMessages();
    this.branchModalError = '';
    this.isBranchSaving = false;
    this.isEditingBranch = true;
    this.branchForm = { ...branch };
    this.showBranchModal = true;
  }

  closeBranchModal(): void {
    this.showBranchModal = false;
    this.isBranchSaving = false;
    this.branchModalError = '';
    this.showBranchMapPicker = false;
  }

  showBranchMapPicker = false;

  openBranchMapPicker(): void {
    this.showBranchMapPicker = true;
  }

  closeBranchMapPicker(): void {
    this.showBranchMapPicker = false;
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
  }

  viewBranchDetails(branch: Branch): void {
    this.selectedBranchForDetails = branch;
  }

  closeBranchDetails(): void {
    this.selectedBranchForDetails = null;
  }

  saveBranch(): void {
    this.clearMessages();
    if (!this.branchForm.name || !this.branchForm.state || !this.branchForm.district) {
      this.branchModalError = 'Branch Name, State, and District are required.';
      return;
    }

    this.isBranchSaving = true;
    this.branchModalError = '';
    if (this.isEditingBranch && this.branchForm.id) {
      this.adminService.updateBranch(this.branchForm.id, this.branchForm).subscribe({
        next: (res) => {
          this.isBranchSaving = false;
          this.successMessage = `Branch "${res.name}" updated successfully!`;
          this.closeBranchModal();
          this.loadBranches();
          this.fetchDashboardStats();
        },
        error: (err) => {
          this.isBranchSaving = false;
          this.branchModalError = err.error?.message || 'Failed to update branch.';
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
        },
        error: (err) => {
          this.isBranchSaving = false;
          this.branchModalError = err.error?.message || 'Failed to create branch.';
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
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to change branch status.';
      }
    });
  }

  deleteBranch(branch: Branch): void {
    if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) return;

    this.adminService.deleteBranch(branch.id).subscribe({
      next: () => {
        this.successMessage = `Branch "${branch.name}" deleted successfully!`;
        this.loadBranches();
        this.fetchDashboardStats();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete branch.';
      }
    });
  }

  // --- EMPLOYEES ---
  loadEmployees(): void {
    this.loading = true;
    this.adminService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading employees:', err);
      }
    });
  }

  openAddEmployeeModal(defaultRole?: 'BRANCH_MANAGER' | 'CHEF' | 'EMPLOYEE'): void {
    this.clearMessages();
    this.employeeModalError = '';
    this.isEmployeeSaving = false;
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
      role: defaultRole || 'EMPLOYEE',
      branchId: firstBranchId
    };
    this.showEmployeeModal = true;
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
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal = false;
    this.isEmployeeSaving = false;
    this.employeeModalError = '';
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

    this.isEmployeeSaving = true;
    this.employeeModalError = '';
    if (this.isEditingEmployee && this.editingEmployeeId) {
      this.adminService.updateEmployee(this.editingEmployeeId, this.employeeForm).subscribe({
        next: (res) => {
          this.isEmployeeSaving = false;
          this.successMessage = `Employee "${res.firstName} ${res.lastName}" updated successfully!`;
          this.closeEmployeeModal();
          this.loadEmployees();
          this.fetchDashboardStats();
        },
        error: (err) => {
          this.isEmployeeSaving = false;
          this.employeeModalError = err.error?.message || 'Failed to update employee.';
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
        },
        error: (err) => {
          this.isEmployeeSaving = false;
          this.employeeModalError = err.error?.message || 'Failed to create employee.';
        }
      });
    }
  }

  deleteEmployee(emp: Employee): void {
    if (!confirm(`Are you sure you want to delete employee "${emp.firstName} ${emp.lastName}" (${emp.email})?`)) return;

    this.adminService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.successMessage = `Employee "${emp.firstName} ${emp.lastName}" removed successfully!`;
        this.loadEmployees();
        this.fetchDashboardStats();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete employee.';
      }
    });
  }

  // ==========================================
  // --- MENU MANAGEMENT ---
  // ==========================================
  loadMenuSection(): void {
    if (!this.selectedBranchId) return;
    this.loading = true;

    this.adminService.getCategories(this.selectedBranchId).subscribe({
      next: (cats) => {
        this.menuCategories = cats;
        this.adminService.getFoodItems(this.selectedBranchId!).subscribe({
          next: (items) => {
            this.foodItems = items;
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
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
  }

  openEditCategoryModal(cat: MenuCategory): void {
    this.clearMessages();
    this.categoryModalError = '';
    this.isCategorySaving = false;
    this.isEditingCategory = true;
    this.editingCategoryId = cat.id;
    this.categoryForm = { name: cat.name, description: cat.description };
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.isCategorySaving = false;
    this.categoryModalError = '';
  }

  saveCategory(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.categoryForm.name?.trim()) {
      this.categoryModalError = 'Category name is required.';
      return;
    }

    this.isCategorySaving = true;
    this.categoryModalError = '';
    if (this.isEditingCategory && this.editingCategoryId) {
      this.adminService.updateCategory(this.editingCategoryId, this.categoryForm).subscribe({
        next: () => {
          this.isCategorySaving = false;
          this.successMessage = 'Menu category updated successfully!';
          this.showCategoryModal = false;
          this.loadMenuSection();
        },
        error: (err) => {
          this.isCategorySaving = false;
          this.categoryModalError = err.error?.message || 'Failed to update category.';
        }
      });
    } else {
      this.adminService.addCategory(this.selectedBranchId, this.categoryForm).subscribe({
        next: () => {
          this.isCategorySaving = false;
          this.successMessage = 'Menu category created successfully!';
          this.showCategoryModal = false;
          this.loadMenuSection();
        },
        error: (err) => {
          this.isCategorySaving = false;
          this.categoryModalError = err.error?.message || 'Failed to create category.';
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
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete category.';
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
  }

  openEditFoodItemModal(item: FoodItemAdmin): void {
    this.clearMessages();
    this.foodItemModalError = '';
    this.isFoodItemSaving = false;
    this.isEditingFoodItem = true;
    this.editingFoodItemId = item.id;
    this.foodItemForm = { ...item };
    this.showFoodItemModal = true;
  }

  closeFoodItemModal(): void {
    this.showFoodItemModal = false;
    this.isFoodItemSaving = false;
    this.foodItemModalError = '';
  }

  saveFoodItem(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.foodItemForm.name?.trim() || !this.foodItemForm.categoryId) {
      this.foodItemModalError = 'Dish Name, Category, and Price are required.';
      return;
    }

    this.isFoodItemSaving = true;
    this.foodItemModalError = '';
    if (this.isEditingFoodItem && this.editingFoodItemId) {
      this.adminService.updateFoodItem(this.editingFoodItemId, this.foodItemForm).subscribe({
        next: () => {
          this.isFoodItemSaving = false;
          this.successMessage = 'Food item updated successfully!';
          this.showFoodItemModal = false;
          this.loadMenuSection();
        },
        error: (err) => {
          this.isFoodItemSaving = false;
          this.foodItemModalError = err.error?.message || 'Failed to update food item.';
        }
      });
    } else {
      this.adminService.addFoodItem(this.selectedBranchId, this.foodItemForm.categoryId, this.foodItemForm).subscribe({
        next: () => {
          this.isFoodItemSaving = false;
          this.successMessage = 'Food item created successfully!';
          this.showFoodItemModal = false;
          this.loadMenuSection();
        },
        error: (err) => {
          this.isFoodItemSaving = false;
          this.foodItemModalError = err.error?.message || 'Failed to add food item.';
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
      },
      error: () => {
        this.errorMessage = 'Failed to toggle availability.';
      }
    });
  }

  deleteFoodItem(item: FoodItemAdmin): void {
    if (!confirm(`Are you sure you want to delete dish "${item.name}"?`)) return;

    this.adminService.deleteFoodItem(item.id).subscribe({
      next: () => {
        this.successMessage = 'Food item deleted successfully!';
        this.loadMenuSection();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete food item.';
      }
    });
  }

  // ==========================================
  // --- INVENTORY MANAGEMENT ---
  // ==========================================
  loadInventorySection(): void {
    if (!this.selectedBranchId) return;
    this.loading = true;

    this.adminService.getInventoryCategories(this.selectedBranchId).subscribe({
      next: (cats) => {
        this.inventoryCategories = cats;
        this.adminService.getInventoryItems(this.selectedBranchId!).subscribe({
          next: (items) => {
            this.inventoryItems = items;
            this.adminService.getLowStockItems(this.selectedBranchId!).subscribe({
              next: (low) => {
                this.lowStockItems = low;
                this.adminService.getInventoryTransactions(this.selectedBranchId!).subscribe({
                  next: (txs) => {
                    this.inventoryTransactions = txs;
                    this.loading = false;
                  },
                  error: () => { this.loading = false; }
                });
              },
              error: () => { this.loading = false; }
            });
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  openAddInventoryCategoryModal(): void {
    this.clearMessages();
    this.inventoryCategoryModalError = '';
    this.isInventoryCategorySaving = false;
    this.inventoryCategoryForm = { name: '', description: '' };
    this.showInventoryCategoryModal = true;
  }

  closeInventoryCategoryModal(): void {
    this.showInventoryCategoryModal = false;
    this.isInventoryCategorySaving = false;
    this.inventoryCategoryModalError = '';
  }

  saveInventoryCategory(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.inventoryCategoryForm.name?.trim()) {
      this.inventoryCategoryModalError = 'Inventory category name is required.';
      return;
    }

    this.isInventoryCategorySaving = true;
    this.inventoryCategoryModalError = '';
    this.adminService.addInventoryCategory(this.selectedBranchId, this.inventoryCategoryForm).subscribe({
      next: () => {
        this.isInventoryCategorySaving = false;
        this.successMessage = 'Inventory category created successfully!';
        this.showInventoryCategoryModal = false;
        this.loadInventorySection();
      },
      error: (err) => {
        this.isInventoryCategorySaving = false;
        this.inventoryCategoryModalError = err.error?.message || 'Failed to create inventory category.';
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
  }

  openEditInventoryItemModal(item: InventoryItemAdmin): void {
    this.clearMessages();
    this.inventoryItemModalError = '';
    this.isInventoryItemSaving = false;
    this.isEditingInventoryItem = true;
    this.editingInventoryItemId = item.id;
    this.inventoryItemForm = { ...item };
    this.showInventoryItemModal = true;
  }

  closeInventoryItemModal(): void {
    this.showInventoryItemModal = false;
    this.isInventoryItemSaving = false;
    this.inventoryItemModalError = '';
  }

  saveInventoryItem(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.inventoryItemForm.name?.trim() || !this.inventoryItemForm.categoryId) {
      this.inventoryItemModalError = 'Item Name, Category, and Unit are required.';
      return;
    }

    this.isInventoryItemSaving = true;
    this.inventoryItemModalError = '';
    if (this.isEditingInventoryItem && this.editingInventoryItemId) {
      this.adminService.updateInventoryItem(this.editingInventoryItemId, this.inventoryItemForm).subscribe({
        next: () => {
          this.isInventoryItemSaving = false;
          this.successMessage = 'Inventory item updated successfully!';
          this.showInventoryItemModal = false;
          this.loadInventorySection();
        },
        error: (err) => {
          this.isInventoryItemSaving = false;
          this.inventoryItemModalError = err.error?.message || 'Failed to update inventory item.';
        }
      });
    } else {
      this.adminService.addInventoryItem(this.selectedBranchId, this.inventoryItemForm.categoryId, this.inventoryItemForm).subscribe({
        next: () => {
          this.isInventoryItemSaving = false;
          this.successMessage = 'Inventory item created successfully!';
          this.showInventoryItemModal = false;
          this.loadInventorySection();
        },
        error: (err) => {
          this.isInventoryItemSaving = false;
          this.inventoryItemModalError = err.error?.message || 'Failed to add inventory item.';
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
  }

  closeStockAdjustModal(): void {
    this.showStockAdjustModal = false;
    this.isStockAdjustSaving = false;
    this.stockAdjustModalError = '';
  }

  saveStockAdjustment(): void {
    this.clearMessages();
    if (!this.selectedItemForStock) return;

    this.isStockAdjustSaving = true;
    this.stockAdjustModalError = '';
    this.adminService.adjustStock(this.selectedItemForStock.id, this.stockAdjustForm).subscribe({
      next: () => {
        this.isStockAdjustSaving = false;
        this.successMessage = `Stock adjusted for "${this.selectedItemForStock?.name}" (${this.stockAdjustForm.transactionType}: ${this.stockAdjustForm.quantity} ${this.selectedItemForStock?.unit})`;
        this.showStockAdjustModal = false;
        this.loadInventorySection();
      },
      error: (err) => {
        this.isStockAdjustSaving = false;
        this.stockAdjustModalError = err.error?.message || 'Failed to adjust stock.';
      }
    });
  }

  deleteInventoryItem(item: InventoryItemAdmin): void {
    if (!confirm(`Are you sure you want to delete inventory item "${item.name}"?`)) return;

    this.adminService.deleteInventoryItem(item.id).subscribe({
      next: () => {
        this.successMessage = 'Inventory item deleted successfully!';
        this.loadInventorySection();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete inventory item.';
      }
    });
  }

  // ==========================================
  // --- RESERVATIONS & TABLES MANAGEMENT ---
  // ==========================================
  loadReservationsSection(): void {
    if (!this.selectedBranchId) return;
    this.loading = true;

    this.adminService.getTables(this.selectedBranchId).subscribe({
      next: (tbls) => {
        this.tables = tbls;
        this.adminService.getReservations(this.selectedBranchId!).subscribe({
          next: (resList) => {
            this.reservations = resList;
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
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
  }

  openEditTableModal(table: TableAdmin): void {
    this.clearMessages();
    this.tableModalError = '';
    this.isTableSaving = false;
    this.isEditingTable = true;
    this.editingTableId = table.id;
    this.tableForm = { ...table };
    this.showTableModal = true;
  }

  closeTableModal(): void {
    this.showTableModal = false;
    this.isTableSaving = false;
    this.tableModalError = '';
  }

  saveTable(): void {
    this.clearMessages();
    if (!this.selectedBranchId || !this.tableForm.tableNumber?.trim()) {
      this.tableModalError = 'Table number is required.';
      return;
    }

    this.isTableSaving = true;
    this.tableModalError = '';
    if (this.isEditingTable && this.editingTableId) {
      this.adminService.updateTable(this.editingTableId, this.tableForm).subscribe({
        next: () => {
          this.isTableSaving = false;
          this.successMessage = 'Table updated successfully!';
          this.showTableModal = false;
          this.loadReservationsSection();
        },
        error: (err) => {
          this.isTableSaving = false;
          this.tableModalError = err.error?.message || 'Failed to update table.';
        }
      });
    } else {
      this.adminService.addTable(this.selectedBranchId, this.tableForm).subscribe({
        next: () => {
          this.isTableSaving = false;
          this.successMessage = 'Table created successfully!';
          this.showTableModal = false;
          this.loadReservationsSection();
        },
        error: (err) => {
          this.isTableSaving = false;
          this.tableModalError = err.error?.message || 'Failed to add table.';
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
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete table.';
      }
    });
  }

  updateReservationStatus(reservationId: number, status: string): void {
    this.adminService.updateReservationStatus(reservationId, status).subscribe({
      next: () => {
        this.successMessage = `Reservation #${reservationId} marked as ${status}.`;
        this.loadReservationsSection();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to update reservation status.';
      }
    });
  }

  // --- USERS MANAGEMENT ---
  loadUsersSection(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to load user accounts.';
      }
    });
  }

  deleteUserAccount(u: Employee): void {
    if (!confirm(`Are you sure you want to delete user "${u.firstName} ${u.lastName}" (${u.email})?`)) return;

    this.adminService.deleteUser(u.id).subscribe({
      next: () => {
        this.successMessage = `User "${u.email}" removed successfully.`;
        this.loadUsersSection();
        this.fetchDashboardStats();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete user account.';
      }
    });
  }

  // --- ORDERS MANAGEMENT ---
  loadOrdersSection(): void {
    this.loading = true;
    if (this.authService.userRoleSignal() === 'BRANCH_MANAGER' && this.selectedBranchId) {
      this.orderService.getBranchOrders(this.selectedBranchId).subscribe({
        next: (orders: any[]) => {
          this.allOrders = orders;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to load branch orders.';
        }
      });
    } else {
      this.adminService.getAllAdminOrders().subscribe({
        next: (orders: any[]) => {
          this.allOrders = orders;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to load orders.';
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
  }

  closeOrderDetailsModal(): void {
    this.selectedOrderForModal = null;
  }

  // --- REPORTS & ANALYTICS ---
  loadReportsSection(): void {
    this.loading = true;
    const branchIdParam = (this.authService.userRoleSignal() === 'BRANCH_MANAGER' || this.selectedBranchId) ? (this.selectedBranchId || undefined) : undefined;
    this.adminService.getReports(branchIdParam).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to load reports.';
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
}
