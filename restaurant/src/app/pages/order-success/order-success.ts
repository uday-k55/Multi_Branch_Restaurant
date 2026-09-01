import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css'
})
export class OrderSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  order = signal<OrderResponse | null>(null);
  loading = signal<boolean>(true);
  errorMsg = signal<string>('');

  ngOnInit(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));
    if (orderId) {
      this.fetchOrder(orderId);
    } else {
      this.loading.set(false);
      this.errorMsg.set('Invalid Order ID.');
    }
  }

  fetchOrder(id: number): void {
    this.orderService.getOrderById(id).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set('Could not fetch order details.');
      }
    });
  }
}
