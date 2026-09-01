import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { CartService, Branch, FoodItem } from '../../services/cart.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class MenuComponent implements OnInit {
  private orderService = inject(OrderService);
  protected cartService = inject(CartService);
  private route = inject(ActivatedRoute);

  allBranches = signal<Branch[]>([]);
  states = signal<string[]>([]);
  districts = signal<string[]>([]);
  filteredBranches = signal<Branch[]>([]);

  selectedState = signal<string>('');
  selectedDistrict = signal<string>('');
  selectedBranchId = signal<number | null>(null);

  foodItems = signal<FoodItem[]>([]);
  selectedCategory = signal<string>('ALL');
  searchQuery = signal<string>('');

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Derived unique categories
  categories = computed(() => {
    const cats = this.foodItems()
      .map(item => item.categoryName || 'General')
      .filter(Boolean);
    return ['ALL', ...Array.from(new Set(cats))];
  });

  // Filtered menu items
  filteredFoodItems = computed(() => {
    let items = this.foodItems();
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    if (cat !== 'ALL') {
      items = items.filter(i => (i.categoryName || 'General') === cat);
    }
    if (query) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(query) ||
        (i.description && i.description.toLowerCase().includes(query))
      );
    }
    return items;
  });

  ngOnInit(): void {
    this.loadBranchesAndStates();
  }

  loadBranchesAndStates(): void {
    this.loading.set(true);

    // 1. Fetch all active branches
    this.orderService.getBranches().subscribe({
      next: (data) => {
        const activeBranches = data.filter(b => b.active !== false);
        this.allBranches.set(activeBranches);

        // 2. Fetch states from API
        this.orderService.getStates().subscribe({
          next: (statesList) => {
            this.states.set(statesList && statesList.length > 0 ? statesList : Array.from(new Set(activeBranches.map(b => b.state))));
            this.handleInitialBranchSelection(activeBranches);
          },
          error: () => {
            this.states.set(Array.from(new Set(activeBranches.map(b => b.state))));
            this.handleInitialBranchSelection(activeBranches);
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to load branches. Please check backend connection.');
      }
    });
  }

  handleInitialBranchSelection(activeBranches: Branch[]): void {
    const queryBranchId = this.route.snapshot.queryParams['branchId'];
    let initialBranch: Branch | undefined;

    if (queryBranchId) {
      initialBranch = activeBranches.find(b => b.id === Number(queryBranchId));
    }

    if (!initialBranch) {
      const existingBranch = this.cartService.selectedBranch();
      if (existingBranch && activeBranches.some(b => b.id === existingBranch.id)) {
        initialBranch = activeBranches.find(b => b.id === existingBranch.id);
      }
    }

    if (!initialBranch && activeBranches.length > 0) {
      initialBranch = activeBranches[0];
    }

    if (initialBranch) {
      this.applyBranchSelection(initialBranch);
    } else {
      this.loading.set(false);
    }
  }

  applyBranchSelection(branch: Branch): void {
    this.selectedState.set(branch.state);
    this.updateDistrictsForState(branch.state, branch.district);
    this.selectedDistrict.set(branch.district);
    this.updateBranchesForDistrict(branch.state, branch.district);
    this.selectedBranchId.set(branch.id);
    this.cartService.setBranch(branch);
    this.loadMenu(branch.id);
  }

  onStateChange(state: string): void {
    this.selectedState.set(state);
    this.orderService.getDistricts(state).subscribe({
      next: (dists) => {
        this.districts.set(dists);
        if (dists.length > 0) {
          this.selectedDistrict.set(dists[0]);
          this.updateBranchesForDistrict(state, dists[0]);
          const availableBranches = this.filteredBranches();
          if (availableBranches.length > 0) {
            this.selectBranch(availableBranches[0]);
          } else {
            this.selectedBranchId.set(null);
            this.foodItems.set([]);
          }
        } else {
          this.selectedDistrict.set('');
          this.filteredBranches.set([]);
          this.selectedBranchId.set(null);
          this.foodItems.set([]);
        }
      },
      error: () => {
        this.updateDistrictsForState(state);
      }
    });
  }

  onDistrictChange(district: string): void {
    this.selectedDistrict.set(district);
    this.updateBranchesForDistrict(this.selectedState(), district);

    const availableBranches = this.filteredBranches();
    if (availableBranches.length > 0) {
      this.selectBranch(availableBranches[0]);
    } else {
      this.selectedBranchId.set(null);
      this.foodItems.set([]);
    }
  }

  onBranchChange(branchId: number | string): void {
    const bId = Number(branchId);
    const branch = this.allBranches().find(b => b.id === bId);
    if (branch) {
      this.selectBranch(branch);
    }
  }

  updateDistrictsForState(state: string, defaultDistrict?: string): void {
    const districtsForState = Array.from(
      new Set(
        this.allBranches()
          .filter(b => b.state === state)
          .map(b => b.district)
      )
    ).filter(Boolean);
    this.districts.set(districtsForState);
  }

  updateBranchesForDistrict(state: string, district: string): void {
    const branches = this.allBranches().filter(
      b => b.state === state && b.district === district
    );
    this.filteredBranches.set(branches);
  }

  selectBranch(branch: Branch): void {
    const currentBranch = this.cartService.selectedBranch();
    if (currentBranch && currentBranch.id !== branch.id) {
      // Clear cart items from different branch to prevent cross-branch ordering
      this.cartService.clearCart();
    }
    this.selectedBranchId.set(branch.id);
    this.cartService.setBranch(branch);
    this.loadMenu(branch.id);
  }

  loadMenu(branchId: number): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.orderService.getCustomerMenu(branchId).subscribe({
      next: (data) => {
        this.foodItems.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to load menu for selected branch.');
      }
    });
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  addToCart(item: FoodItem): void {
    this.cartService.addToCart(item);
  }

  getItemQuantity(itemId: number): number {
    const found = this.cartService.items().find(i => i.foodItem.id === itemId);
    return found ? found.quantity : 0;
  }
}
