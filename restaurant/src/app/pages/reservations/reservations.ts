import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OrderService, RestaurantTable, ReservationRequest, ReservationResponse } from '../../services/order.service';
import { CartService, Branch } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class ReservationsComponent implements OnInit {
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  protected authService = inject(AuthService);
  private router = inject(Router);

  branches = signal<Branch[]>([]);
  selectedBranchId = signal<number | null>(null);

  // Search criteria
  reservationDate = signal<string>(new Date().toISOString().split('T')[0]);
  reservationTime = signal<string>('19:00');
  numberOfPeople = signal<number>(2);

  // Available tables
  availableTables = signal<RestaurantTable[]>([]);
  selectedTableId = signal<number | null>(null);
  selectedTableNumber = signal<string>('');

  // Customer info
  customerName = signal<string>('');
  customerPhone = signal<string>('');
  customerEmail = signal<string>('');
  specialRequests = signal<string>('');

  searchingTables = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMsg = signal<string>('');
  confirmedReservation = signal<ReservationResponse | null>(null);

  minDate = new Date().toISOString().split('T')[0];

  timeSlots: string[] = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
  ];

  ngOnInit(): void {
    this.loadBranches();
    this.initCustomerDetails();
  }

  loadBranches(): void {
    this.orderService.getBranches().subscribe({
      next: (data) => {
        const activeBranches = data.filter(b => b.active !== false);
        this.branches.set(activeBranches);

        const currentBranch = this.cartService.selectedBranch();
        if (currentBranch && activeBranches.some(b => b.id === currentBranch.id)) {
          this.selectedBranchId.set(currentBranch.id);
        } else if (activeBranches.length > 0) {
          this.selectedBranchId.set(activeBranches[0].id);
        }
      },
      error: () => {
        this.errorMsg.set('Failed to load restaurant locations.');
      }
    });
  }

  initCustomerDetails(): void {
    if (this.authService.isLoggedIn()) {
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.customerName.set(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
          this.customerEmail.set(profile.email || '');
          this.customerPhone.set(profile.phoneNumber || '');
        },
        error: () => {}
      });
    }
  }

  searchAvailableTables(): void {
    this.errorMsg.set('');
    this.hasSearched.set(false);
    this.selectedTableId.set(null);

    const branchId = this.selectedBranchId();
    if (!branchId) {
      this.errorMsg.set('Please select a restaurant branch.');
      return;
    }

    if (!this.reservationDate()) {
      this.errorMsg.set('Please choose a valid reservation date.');
      return;
    }

    this.searchingTables.set(true);
    this.orderService.findAvailableTables(branchId, this.reservationDate(), this.reservationTime(), this.numberOfPeople()).subscribe({
      next: (tables) => {
        this.searchingTables.set(false);
        this.hasSearched.set(true);
        this.availableTables.set(tables);
        if (tables.length > 0) {
          this.selectedTableId.set(tables[0].id);
          this.selectedTableNumber.set(tables[0].tableNumber);
        }
      },
      error: (err) => {
        this.searchingTables.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to search available tables.');
      }
    });
  }

  selectTable(table: RestaurantTable): void {
    this.selectedTableId.set(table.id);
    this.selectedTableNumber.set(table.tableNumber);
  }

  submitReservation(): void {
    this.errorMsg.set('');

    if (!this.selectedBranchId()) {
      this.errorMsg.set('Please select a branch.');
      return;
    }

    if (!this.selectedTableId()) {
      this.errorMsg.set('Please select an available table.');
      return;
    }

    if (!this.customerName().trim() || !this.customerPhone().trim() || !this.customerEmail().trim()) {
      this.errorMsg.set('Name, phone number, and email are required.');
      return;
    }

    const payload: ReservationRequest = {
      branchId: this.selectedBranchId()!,
      tableId: this.selectedTableId()!,
      customerName: this.customerName().trim(),
      customerPhone: this.customerPhone().trim(),
      customerEmail: this.customerEmail().trim(),
      reservationDate: this.reservationDate(),
      reservationTime: this.reservationTime(),
      numberOfPeople: this.numberOfPeople(),
      specialRequests: this.specialRequests().trim() || undefined
    };

    this.submitting.set(true);
    this.orderService.createReservation(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.confirmedReservation.set(res);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to book reservation. The table might have just been booked.');
      }
    });
  }

  resetForm(): void {
    this.confirmedReservation.set(null);
    this.hasSearched.set(false);
    this.availableTables.set([]);
    this.selectedTableId.set(null);
  }
}
