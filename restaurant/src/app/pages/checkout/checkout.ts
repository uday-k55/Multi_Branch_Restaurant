import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService, OrderType, Branch } from '../../services/cart.service';
import { OrderService, RestaurantTable } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { LocationPickerModalComponent, LocationSelectedResult } from '../../components/location-picker-modal/location-picker-modal';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LocationPickerModalComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  protected cartService = inject(CartService);
  private orderService = inject(OrderService);
  protected authService = inject(AuthService);
  private router = inject(Router);

  branches = signal<Branch[]>([]);
  tables = signal<RestaurantTable[]>([]);

  selectedBranchId = signal<number | null>(null);
  selectedOrderType = signal<OrderType>('DINE_IN');
  selectedTableId = signal<number | null>(null);

  deliveryAddress = signal<string>('');
  latitude = signal<number | null>(10.0100);
  longitude = signal<number | null>(76.3600);

  validatingDelivery = signal<boolean>(false);
  deliveryValid = signal<boolean | null>(null);
  deliveryMsg = signal<string>('');
  deliveryDistance = signal<number | null>(null);

  submitting = signal<boolean>(false);
  errorMsg = signal<string>('');

  ngOnInit(): void {
    this.loadBranches();
    this.selectedOrderType.set(this.cartService.orderType());
    this.deliveryAddress.set(this.cartService.deliveryAddress() || '');
    if (this.cartService.latitude() !== null) this.latitude.set(this.cartService.latitude());
    if (this.cartService.longitude() !== null) this.longitude.set(this.cartService.longitude());
  }

  loadBranches(): void {
    this.orderService.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data);
        const existingBranch = this.cartService.selectedBranch();
        if (existingBranch && data.some(b => b.id === existingBranch.id)) {
          this.selectedBranchId.set(existingBranch.id);
          this.loadTables(existingBranch.id);
        } else if (data.length > 0) {
          this.selectedBranchId.set(data[0].id);
          this.cartService.setBranch(data[0]);
          this.loadTables(data[0].id);
        }
      },
      error: () => {
        this.errorMsg.set('Failed to load restaurant branches.');
      }
    });
  }

  onBranchChange(event: Event): void {
    const branchId = Number((event.target as HTMLSelectElement).value);
    this.selectedBranchId.set(branchId);
    const branch = this.branches().find(b => b.id === branchId) || null;
    this.cartService.setBranch(branch);
    this.selectedTableId.set(null);
    this.cartService.setTable(null);
    this.deliveryValid.set(null);
    this.loadTables(branchId);
  }

  loadTables(branchId: number): void {
    this.orderService.getBranchTables(branchId).subscribe({
      next: (data) => {
        this.tables.set(data);
        if (this.cartService.selectedTableId()) {
          this.selectedTableId.set(this.cartService.selectedTableId());
        } else if (data.length > 0) {
          this.selectedTableId.set(data[0].id);
          this.cartService.setTable(data[0].id, data[0].tableNumber);
        }
      },
      error: () => {
        this.tables.set([]);
      }
    });
  }

  onOrderTypeChange(type: OrderType): void {
    this.selectedOrderType.set(type);
    this.cartService.setOrderType(type);
    this.errorMsg.set('');
  }

  onTableChange(event: Event): void {
    const tableId = Number((event.target as HTMLSelectElement).value);
    this.selectedTableId.set(tableId);
    const tbl = this.tables().find(t => t.id === tableId);
    this.cartService.setTable(tableId, tbl ? tbl.tableNumber : null);
  }

  gettingLocation = signal<boolean>(false);
  locationError = signal<string>('');
  showMapPicker = signal<boolean>(false);

  openMapPicker(): void {
    this.locationError.set('');
    this.showMapPicker.set(true);
  }

  closeMapPicker(): void {
    this.showMapPicker.set(false);
  }

  onLocationChosenFromMap(result: LocationSelectedResult): void {
    this.showMapPicker.set(false);
    this.latitude.set(result.lat);
    this.longitude.set(result.lng);
    this.deliveryAddress.set(result.address);

    if (this.selectedBranchId()) {
      this.validatingDelivery.set(true);
      this.orderService.validateDelivery(this.selectedBranchId()!, result.lat, result.lng).subscribe({
        next: (res) => {
          this.validatingDelivery.set(false);
          this.deliveryValid.set(res.allowed);
          if (res.allowed) {
            this.deliveryMsg.set(`Home delivery is available! (${res.distanceKm?.toFixed(1) || '0'} km from branch)`);
          } else {
            this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
          }
          this.deliveryDistance.set(res.distanceKm ?? null);
          this.cartService.setDeliveryInfo(result.address, result.lat, result.lng);
        },
        error: () => {
          this.validatingDelivery.set(false);
          this.deliveryValid.set(false);
          this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
        }
      });
    } else {
      this.cartService.setDeliveryInfo(result.address, result.lat, result.lng);
    }
  }

  useCurrentLocation(): void {
    this.locationError.set('');
    this.deliveryMsg.set('');

    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser.');
      return;
    }

    if (!this.selectedBranchId()) {
      this.locationError.set('Please select a branch first.');
      return;
    }

    this.gettingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (isNaN(lat) || isNaN(lon)) {
          this.gettingLocation.set(false);
          this.locationError.set('Invalid coordinates received.');
          return;
        }

        this.latitude.set(lat);
        this.longitude.set(lon);

        // Reverse geocode to populate delivery address text
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name && !this.deliveryAddress().trim()) {
              this.deliveryAddress.set(data.display_name);
            }
          })
          .catch(() => {
            if (!this.deliveryAddress().trim()) {
              this.deliveryAddress.set(`Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
            }
          });

        // Validate 10 km radius with selected branch
        this.orderService.validateDelivery(this.selectedBranchId()!, lat, lon).subscribe({
          next: (res) => {
            this.gettingLocation.set(false);
            this.deliveryValid.set(res.allowed);
            if (res.allowed) {
              this.deliveryMsg.set(`Home delivery is available! (${res.distanceKm?.toFixed(1) || '0'} km from branch)`);
            } else {
              this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
            }
            this.deliveryDistance.set(res.distanceKm ?? null);
            this.cartService.setDeliveryInfo(this.deliveryAddress(), lat, lon);
          },
          error: () => {
            this.gettingLocation.set(false);
            this.deliveryValid.set(false);
            this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
          }
        });
      },
      (error) => {
        this.gettingLocation.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set('Location permission was denied. Please enter your address manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('Location information is unavailable. Please enter your address manually.');
            break;
          case error.TIMEOUT:
            this.locationError.set('Location request timed out. Please enter your address manually.');
            break;
          default:
            this.locationError.set('Unable to retrieve your current location. Please enter your address manually.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  validateDeliveryRadius(): void {
    if (!this.selectedBranchId()) {
      this.errorMsg.set('Please select a branch first.');
      return;
    }
    if (this.latitude() === null || this.longitude() === null) {
      this.errorMsg.set('Please click "📍 Use My Current Location" or enter coordinates.');
      return;
    }

    this.validatingDelivery.set(true);
    this.errorMsg.set('');
    this.orderService.validateDelivery(this.selectedBranchId()!, this.latitude()!, this.longitude()!).subscribe({
      next: (res) => {
        this.validatingDelivery.set(false);
        this.deliveryValid.set(res.allowed);
        if (res.allowed) {
          this.deliveryMsg.set(res.message);
        } else {
          this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
        }
        this.deliveryDistance.set(res.distanceKm ?? null);
        this.cartService.setDeliveryInfo(this.deliveryAddress(), this.latitude(), this.longitude());
      },
      error: () => {
        this.validatingDelivery.set(false);
        this.deliveryValid.set(false);
        this.deliveryMsg.set('Home delivery is available only within 10 km of the selected branch.');
      }
    });
  }

  submitOrder(): void {
    this.errorMsg.set('');

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    if (this.cartService.items().length === 0) {
      this.errorMsg.set('Your cart is empty. Please add items from the menu.');
      return;
    }

    if (!this.selectedBranchId()) {
      this.errorMsg.set('Please select a branch.');
      return;
    }

    const orderType = this.selectedOrderType();

    if (orderType === 'DINE_IN' && !this.selectedTableId()) {
      this.errorMsg.set('Table selection is required for Dine-In orders.');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!this.deliveryAddress().trim()) {
        this.errorMsg.set('Delivery address is required for Home Delivery orders.');
        return;
      }
      if (this.latitude() === null || this.longitude() === null) {
        this.errorMsg.set('Coordinates are required for delivery validation.');
        return;
      }
      if (this.deliveryValid() === false) {
        this.errorMsg.set('Delivery location is outside the 10 km radius limit for this branch.');
        return;
      }
    }

    const payload = {
      branchId: this.selectedBranchId()!,
      orderType: orderType,
      tableId: orderType === 'DINE_IN' ? this.selectedTableId() : null,
      deliveryAddress: orderType === 'DELIVERY' ? this.deliveryAddress().trim() : undefined,
      latitude: orderType === 'DELIVERY' ? this.latitude() : undefined,
      longitude: orderType === 'DELIVERY' ? this.longitude() : undefined,
      items: this.cartService.items().map(i => ({
        foodItemId: i.foodItem.id,
        quantity: i.quantity
      }))
    };

    this.submitting.set(true);

    this.orderService.createOrder(payload).subscribe({
      next: (createdOrder) => {
        this.cartService.clearCart();
        
        // Initiate demo payment for order
        this.orderService.initiatePayment({
          orderId: createdOrder.id,
          amount: createdOrder.totalAmount,
          paymentMethod: 'DEMO'
        }).subscribe({
          next: (payment) => {
            this.submitting.set(false);
            this.router.navigate(['/payment', payment.id], {
              queryParams: { orderId: createdOrder.id, amount: createdOrder.totalAmount }
            });
          },
          error: () => {
            this.submitting.set(false);
            this.router.navigate(['/order-success', createdOrder.id]);
          }
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const backendMessage = err.error?.message || err.message || 'Failed to place order. Please try again.';
        this.errorMsg.set(backendMessage);
      }
    });
  }
}
