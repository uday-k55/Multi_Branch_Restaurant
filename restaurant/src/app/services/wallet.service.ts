import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WalletTransaction {
  id: number;
  orderId?: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/wallet`;

  getMyWallet(): Observable<WalletData> {
    return this.http.get<WalletData>(this.apiUrl);
  }
}
