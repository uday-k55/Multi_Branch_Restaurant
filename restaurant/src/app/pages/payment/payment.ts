import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService, PaymentResponse } from '../../services/order.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class PaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);

  paymentId = signal<number | null>(null);
  orderId = signal<number | null>(null);
  amount = signal<number>(0);

  // Demo payment form fields (Client-side mock only)
  cardHolder = signal<string>('Alex Johnson');
  cardNumber = signal<string>('4111 2222 3333 4444');
  expiryDate = signal<string>('12/28');
  cvv = signal<string>('123');
  paymentMethod = signal<string>('DEMO_CARD');

  processing = signal<boolean>(false);
  paymentResult = signal<PaymentResponse | null>(null);
  errorMsg = signal<string>('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('paymentId');
    const orderIdParam = this.route.snapshot.queryParams['orderId'];
    const amountParam = this.route.snapshot.queryParams['amount'];

    if (idParam) {
      this.paymentId.set(Number(idParam));
    }
    if (orderIdParam) {
      this.orderId.set(Number(orderIdParam));
    }
    if (amountParam) {
      this.amount.set(Number(amountParam));
    }
  }

  processDemoPayment(isSuccess: boolean): void {
    this.errorMsg.set('');

    const pid = this.paymentId();
    if (!pid) {
      this.errorMsg.set('Payment ID not found.');
      return;
    }

    this.processing.set(true);

    const payload = isSuccess
      ? {
          status: 'PAID' as const,
          transactionId: `TXN-DEMO-${Date.now()}`
        }
      : {
          status: 'FAILED' as const,
          failureReason: 'Card issuer simulated decline / insufficient balance'
        };

    this.orderService.processPayment(pid, payload).subscribe({
      next: (res) => {
        this.processing.set(false);
        this.paymentResult.set(res);

        if (res.status === 'PAID' && res.orderId) {
          setTimeout(() => {
            this.router.navigate(['/order-success', res.orderId]);
          }, 1800);
        }
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMsg.set(err.error?.message || 'Payment processing encountered an error.');
      }
    });
  }
}
