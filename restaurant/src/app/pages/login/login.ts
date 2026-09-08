import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = {
    email: '',
    password: '',
    remember: false
  };

  errorMessage = '';
  loading = false;

  onSubmit(): void {
    this.errorMessage = '';
    this.loading = true;

    this.authService.login({ email: this.credentials.email, password: this.credentials.password })
      .subscribe({
        next: (response) => {
          this.loading = false;
          const targetUrl = this.authService.getPermittedUrlForRole(response.role);
          this.router.navigate([targetUrl]);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
        }
      });
  }
}
