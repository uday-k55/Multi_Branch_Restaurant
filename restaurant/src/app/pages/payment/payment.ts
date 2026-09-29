import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService, PaymentResponse } from '../../services/order.service';

export type PaymentMethodType = 'UPI' | 'CARD' | 'CASH' | 'WALLET';
export type CardType = 'Visa' | 'Mastercard' | 'RuPay' | 'Unknown';

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

  // Selected payment method
  selectedMethod = signal<PaymentMethodType>('UPI');

  // UPI fields
  upiId = signal<string>('');
  upiVerified = signal<boolean>(false);
  upiError = signal<string>('');
  upiVerifying = signal<boolean>(false);

  // Card fields
  cardNumber = signal<string>('');
  cardHolder = signal<string>('');
  expiryMonth = signal<string>('');
  expiryYear = signal<string>('');
  cvv = signal<string>('');
  cardError = signal<string>('');

  // Processing & Result State
  processing = signal<boolean>(false);
  paymentResult = signal<PaymentResponse | null>(null);
  isSuccessResult = signal<boolean>(false);
  resultMessage = signal<string>('');
  transactionId = signal<string>('');
  errorMsg = signal<string>('');

  // Expiry Month options
  months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  years: number[] = [];

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y <= currentYear + 15; y++) {
      this.years.push(y);
    }
  }

  // Detect card type based on number
  cardType = computed<CardType>(() => {
    const clean = this.cardNumber().replace(/\s+/g, '');
    if (!clean) return 'Unknown';
    if (clean.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
    if (/^(60|65|81|82|508|353|356)/.test(clean)) return 'RuPay';
    return 'Unknown';
  });

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

  onMethodChange(method: PaymentMethodType): void {
    this.selectedMethod.set(method);
    this.errorMsg.set('');
  }

  // UPI Verification
  verifyUpiId(): void {
    this.upiError.set('');
    this.upiVerified.set(false);

    const val = this.upiId().trim();
    if (!val) {
      this.upiError.set('Please enter your UPI ID.');
      return;
    }

    // Standard UPI ID pattern: user@bank
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(val)) {
      this.upiError.set('Invalid UPI ID format. Example: yourname@upi or mobile@okhdfcbank');
      return;
    }

    this.upiVerifying.set(true);
    setTimeout(() => {
      this.upiVerifying.set(false);
      this.upiVerified.set(true);
    }, 600);
  }

  onUpiInput(): void {
    if (this.upiVerified()) {
      this.upiVerified.set(false);
    }
    this.upiError.set('');
  }

  formatCardNumber(event: any): void {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 16) input = input.substring(0, 16);
    const parts = input.match(/[\s\S]{1,4}/g) || [];
    this.cardNumber.set(parts.join(' '));
    this.cardError.set('');
  }

  validateCard(): boolean {
    this.cardError.set('');
    const rawNumber = this.cardNumber().replace(/\s+/g, '');

    if (!rawNumber || rawNumber.length < 15 || rawNumber.length > 16) {
      this.cardError.set('Please enter a valid 16-digit card number.');
      return false;
    }

    if (!this.cardHolder().trim()) {
      this.cardError.set('Cardholder name is required.');
      return false;
    }

    if (!this.expiryMonth() || !this.expiryYear()) {
      this.cardError.set('Please select valid expiry month and year.');
      return false;
    }

    // Check expiration date
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const expY = Number(this.expiryYear());
    const expM = Number(this.expiryMonth());

    if (expY < curYear || (expY === curYear && expM < curMonth)) {
      this.cardError.set('The card has expired. Please use a valid card.');
      return false;
    }

    if (!this.cvv().trim() || this.cvv().trim().length < 3) {
      this.cardError.set('Please enter a valid 3 or 4 digit CVV.');
      return false;
    }

    return true;
  }

  // Pay button action
  processPayment(): void {
    this.errorMsg.set('');

    const pid = this.paymentId();
    if (!pid) {
      this.errorMsg.set('Payment record not found.');
      return;
    }

    const method = this.selectedMethod();

    if (method === 'UPI') {
      if (!this.upiVerified()) {
        this.errorMsg.set('Please verify your UPI ID before proceeding.');
        return;
      }
    } else if (method === 'CARD') {
      if (!this.validateCard()) {
        return;
      }
    }

    this.processing.set(true);

    if (method === 'WALLET') {
      // Demonstrated Failed Payment scenario
      const payload = {
        status: 'FAILED' as const,
        paymentMethod: 'WALLET',
        transactionId: `TXN-WLT-FAIL-${Date.now()}`,
        failureReason: 'Transaction declined: Insufficient wallet balance or demonstration wallet failure.'
      };

      this.orderService.processPayment(pid, payload).subscribe({
        next: (res) => {
          this.processing.set(false);
          this.paymentResult.set(res);
          this.isSuccessResult.set(false);
          this.transactionId.set(res.transactionId || payload.transactionId);
          this.resultMessage.set('Transaction declined: Insufficient wallet balance or wallet gateway authorization failed.');
        },
        error: (err) => {
          this.processing.set(false);
          this.isSuccessResult.set(false);
          this.resultMessage.set(err.error?.message || 'Wallet payment was declined.');
          this.paymentResult.set({
            id: pid,
            orderId: this.orderId() || 0,
            orderType: 'DINE_IN',
            branchId: 0,
            amount: this.amount(),
            status: 'FAILED',
            paymentMethod: 'WALLET',
            transactionId: payload.transactionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
      return;
    }

    // Success scenarios: UPI, Card, Cash
    const txnPrefix = method === 'UPI' ? 'TXN-UPI' : method === 'CARD' ? 'TXN-CARD' : 'TXN-CASH';
    const txnId = `${txnPrefix}-${Date.now()}`;

    const payload = {
      status: 'PAID' as const,
      paymentMethod: method,
      transactionId: txnId
    };

    this.orderService.processPayment(pid, payload).subscribe({
      next: (res) => {
        this.processing.set(false);
        this.paymentResult.set(res);
        this.isSuccessResult.set(true);
        this.transactionId.set(res.transactionId || txnId);
        if (method === 'CASH') {
          this.resultMessage.set('Cash Order confirmed! Please pay at the counter or upon delivery.');
        } else {
          this.resultMessage.set('Your payment was authorized and processed successfully.');
        }
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMsg.set(err.error?.message || 'Payment processing encountered an error. Please try again.');
      }
    });
  }

  tryAgain(): void {
    this.paymentResult.set(null);
    this.isSuccessResult.set(false);
    this.resultMessage.set('');
    this.errorMsg.set('');
    this.selectedMethod.set('UPI');
  }
}
