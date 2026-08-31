import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  readonly isCollapsed = signal(true);

  toggleNavbar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
