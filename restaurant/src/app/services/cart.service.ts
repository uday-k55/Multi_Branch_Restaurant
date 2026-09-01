import { Injectable, signal, computed } from '@angular/core';

export interface FoodItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  enabled: boolean;
  isSeasonal?: boolean;
  categoryId?: number;
  categoryName?: string;
  branchId?: number;
}

export interface Branch {
  id: number;
  name: string;
  state: string;
  district: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  closingHours?: string;
  active?: boolean;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly selectedBranch = signal<Branch | null>(null);
  readonly orderType = signal<OrderType>('DINE_IN');
  readonly selectedTableId = signal<number | null>(null);
  readonly selectedTableNumber = signal<string | null>(null);
  readonly deliveryAddress = signal<string>('');
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);

  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + (item.foodItem.price * item.quantity), 0)
  );

  readonly total = computed(() => this.subtotal());

  addToCart(foodItem: FoodItem): void {
    const currentItems = [...this.items()];
    const index = currentItems.findIndex(i => i.foodItem.id === foodItem.id);
    if (index >= 0) {
      currentItems[index] = {
        ...currentItems[index],
        quantity: currentItems[index].quantity + 1
      };
    } else {
      currentItems.push({ foodItem, quantity: 1 });
    }
    this.items.set(currentItems);
  }

  increaseQuantity(foodItemId: number): void {
    const currentItems = this.items().map(item => {
      if (item.foodItem.id === foodItemId) {
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    });
    this.items.set(currentItems);
  }

  decreaseQuantity(foodItemId: number): void {
    const currentItems = this.items()
      .map(item => {
        if (item.foodItem.id === foodItemId) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      })
      .filter(item => item.quantity > 0);
    this.items.set(currentItems);
  }

  removeFromCart(foodItemId: number): void {
    this.items.set(this.items().filter(item => item.foodItem.id !== foodItemId));
  }

  clearCart(): void {
    this.items.set([]);
  }

  setBranch(branch: Branch | null): void {
    this.selectedBranch.set(branch);
  }

  setOrderType(type: OrderType): void {
    this.orderType.set(type);
  }

  setTable(tableId: number | null, tableNumber: string | null = null): void {
    this.selectedTableId.set(tableId);
    this.selectedTableNumber.set(tableNumber);
  }

  setDeliveryInfo(address: string, lat: number | null, lon: number | null): void {
    this.deliveryAddress.set(address);
    this.latitude.set(lat);
    this.longitude.set(lon);
  }
}
