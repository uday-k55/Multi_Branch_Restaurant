import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService, ReservationResponse } from '../../services/order.service';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.css'
})
export class MyReservationsComponent implements OnInit {
  private orderService = inject(OrderService);

  reservations = signal<ReservationResponse[]>([]);
  loading = signal<boolean>(true);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading.set(true);
    this.orderService.getMyReservations().subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to load your reservations history.');
      }
    });
  }

  cancelReservation(id: number): void {
    if (!confirm(`Are you sure you want to cancel Reservation #${id}?`)) return;

    this.errorMsg.set('');
    this.successMsg.set('');
    this.orderService.cancelMyReservation(id).subscribe({
      next: () => {
        this.successMsg.set(`Reservation #${id} has been cancelled successfully.`);
        this.loadReservations();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Failed to cancel reservation.');
      }
    });
  }
}
