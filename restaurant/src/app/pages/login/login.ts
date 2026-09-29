import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
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
  private cdr = inject(ChangeDetectorRef);

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
    this.cdr.detectChanges();

    this.authService.login({ email: this.credentials.email, password: this.credentials.password })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const targetUrl = this.authService.getPermittedUrlForRole(response.role);
          this.router.navigate([targetUrl]);
        },
        error: (err) => {
          if (err.status === 403) {
            this.errorMessage = err.error?.message || 'Your account has been blacklisted. Please contact the restaurant administrator.';
          } else if (err.status === 401) {
            this.errorMessage = 'Invalid email or password. Please try again.';
          } else if (err.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please try again later.';
          } else {
            this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
          }
          this.cdr.detectChanges();
        }
      });
  }
}
