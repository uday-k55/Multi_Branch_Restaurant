import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isLoggedInSignal = signal(localStorage.getItem('isLoggedIn') === 'true');
  userRoleSignal = signal(localStorage.getItem('userRole') || '');

  login(email: string): void {
    localStorage.setItem('isLoggedIn', 'true');
    const role = (email === 'admin1@gmail.com' || email === 'admin2@gmail.com') ? 'admin' : 'customer';
    localStorage.setItem('userRole', role);
    
    this.isLoggedInSignal.set(true);
    this.userRoleSignal.set(role);
  }

  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    this.isLoggedInSignal.set(false);
    this.userRoleSignal.set('');
  }

  isAdmin(): boolean {
    return this.isLoggedInSignal() && this.userRoleSignal() === 'admin';
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSignal();
  }
}
