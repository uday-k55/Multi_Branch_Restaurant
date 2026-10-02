import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: string;
  branchId?: number;
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  role: string;
  branchId?: number;
  branchName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'https://multi-branch-restaurant.onrender.com/api/auth';

  isLoggedInSignal = signal<boolean>(!!localStorage.getItem('token'));
  userRoleSignal = signal<string>(localStorage.getItem('userRole') || '');
  currentUserSignal = signal<any>(null);

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userId', res.userId.toString());
          localStorage.setItem('email', res.email);
          localStorage.setItem('userRole', res.role);
          if (res.branchId != null) {
            localStorage.setItem('branchId', res.branchId.toString());
          } else {
            localStorage.removeItem('branchId');
          }

          this.isLoggedInSignal.set(true);
          this.userRoleSignal.set(res.role);
          this.currentUserSignal.set(res);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('userRole');
    localStorage.removeItem('branchId');
    localStorage.removeItem('isLoggedIn');

    this.isLoggedInSignal.set(false);
    this.userRoleSignal.set('');
    this.currentUserSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string {
    return this.userRoleSignal() || localStorage.getItem('userRole') || '';
  }

  getPermittedUrlForRole(role?: string): string {
    const r = (role || this.getRole()).toUpperCase();
    switch (r) {
      case 'ADMIN':
      case 'BRANCH_MANAGER':
        return '/admin';
      case 'CHEF':
        return '/chef';
      case 'EMPLOYEE':
        return '/employee';
      case 'CUSTOMER':
      default:
        return '/';
    }
  }

  isAdmin(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal().toUpperCase() === 'ADMIN';
  }

  isBranchManager(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal().toUpperCase() === 'BRANCH_MANAGER' || this.userRoleSignal().toUpperCase() === 'ADMIN');
  }

  isStrictBranchManager(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal().toUpperCase() === 'BRANCH_MANAGER';
  }

  isChef(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal().toUpperCase() === 'CHEF' || this.userRoleSignal().toUpperCase() === 'ADMIN');
  }

  isStrictChef(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal().toUpperCase() === 'CHEF';
  }

  isEmployee(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal().toUpperCase() === 'EMPLOYEE' || this.userRoleSignal().toUpperCase() === 'ADMIN');
  }

  isStrictEmployee(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal().toUpperCase() === 'EMPLOYEE';
  }

  isCustomer(): boolean {
    if (!this.isLoggedInSignal()) return true;
    const r = this.userRoleSignal().toUpperCase();
    return r === 'CUSTOMER' || r === '';
  }

  getBranchId(): number | null {
    const b = localStorage.getItem('branchId');
    return b ? parseInt(b, 10) : null;
  }

  getUserId(): number | null {
    const u = localStorage.getItem('userId');
    return u ? parseInt(u, 10) : null;
  }

  getUserEmail(): string {
    return localStorage.getItem('email') || '';
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSignal() && !!this.getToken();
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, profile);
  }
}
