import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService, RestaurantTable } from '../../services/order.service';
import { CartService, Branch } from '../../services/cart.service';

@Component({
  selector: 'app-qr-order',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './qr-order.html',
  styleUrl: './qr-order.css'
})
export class QrOrderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);

  loading = signal<boolean>(true);
  table = signal<RestaurantTable | null>(null);
  branch = signal<Branch | null>(null);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  ngOnInit(): void {
    const qrCode = this.route.snapshot.paramMap.get('qrCode');
    if (!qrCode) {
      this.loading.set(false);
      this.errorMsg.set('No QR code provided.');
      return;
    }

    this.resolveQrCode(qrCode);
  }

  resolveQrCode(qrCode: string): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.orderService.getTableByQrCode(qrCode).subscribe({
      next: (tableData) => {
        if (!tableData || tableData.active === false) {
          this.loading.set(false);
          this.errorMsg.set('This table is currently inactive or invalid.');
          return;
        }

        this.table.set(tableData);

        // Fetch branch for this table
        this.orderService.getBranches().subscribe({
          next: (branches) => {
            const matchedBranch = branches.find(b => b.id === tableData.branchId);
            if (matchedBranch) {
              this.branch.set(matchedBranch);
              // Authoritatively set branch and table context in CartService
              this.cartService.setBranch(matchedBranch);
              this.cartService.setTable(tableData.id, tableData.tableNumber);
              this.cartService.setOrderType('DINE_IN');

              this.loading.set(false);
              this.successMsg.set(`Table ${tableData.tableNumber} verified for ${matchedBranch.name}! Redirecting to menu...`);

              setTimeout(() => {
                this.router.navigate(['/menu'], { queryParams: { branchId: matchedBranch.id, qr: 'true' } });
              }, 1500);
            } else {
              this.loading.set(false);
              this.errorMsg.set('Associated restaurant branch not found.');
            }
          },
          error: () => {
            this.loading.set(false);
            this.errorMsg.set('Failed to verify restaurant branch.');
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Invalid or expired QR code. Please scan a valid table QR.');
      }
    });
  }

  proceedToMenu(): void {
    if (this.branch()) {
      this.router.navigate(['/menu'], { queryParams: { branchId: this.branch()!.id, qr: 'true' } });
    }
  }
}
