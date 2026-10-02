import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { CartService } from '../../services/cart.service';

export interface NotificationItem {
  id: number;
  recipientRole?: string;
  recipientUserId?: number;
  branchId?: number;
  orderId?: number;
  notificationType: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);
  protected cartService = inject(CartService);
  private router = inject(Router);
  private http = inject(HttpClient);

  readonly isCollapsed = signal(true);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly showNotifDropdown = signal(false);
  private notifInterval: any;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadNotifications();
      this.notifInterval = setInterval(() => this.loadNotifications(), 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.notifInterval) {
      clearInterval(this.notifInterval);
    }
  }

  loadNotifications(): void {
    if (!this.authService.isLoggedIn()) return;
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.http.get<NotificationItem[]>(`https://multi-branch-restaurant.onrender.com/api/notifications/user/${userId}`).subscribe({
      next: (data) => {
        this.notifications.set(data || []);
      },
      error: () => {}
    });
  }

  get unreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
  }

  toggleNotifDropdown(): void {
    this.showNotifDropdown.update(v => !v);
  }

  markRead(id: number, event: Event): void {
    event.stopPropagation();
    this.http.patch<NotificationItem>(`https://multi-branch-restaurant.onrender.com/api/notifications/${id}/read`, {}).subscribe({
      next: () => this.loadNotifications()
    });
  }

  toggleNavbar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.notifications.set([]);
    this.router.navigate(['/login']);
  }
}
