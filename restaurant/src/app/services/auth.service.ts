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
  private apiUrl = 'http://localhost:8080/api/auth';

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

  isAdmin(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal() === 'ADMIN';
  }

  isBranchManager(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal() === 'BRANCH_MANAGER' || this.userRoleSignal() === 'ADMIN');
  }

  isChef(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal() === 'CHEF' || this.userRoleSignal() === 'ADMIN');
  }

  isEmployee(): boolean {
    return this.isLoggedInSignal() && (this.userRoleSignal() === 'EMPLOYEE' || this.userRoleSignal() === 'ADMIN');
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
