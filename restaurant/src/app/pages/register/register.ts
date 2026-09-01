import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  user = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: 'male',
    password: ''
  };

  message = '';
  errorMessage = '';

  onSubmit(): void {
    this.message = '';
    this.errorMessage = '';

    this.http.post<any>('http://localhost:8080/api/register', this.user)
      .subscribe({
        next: (response) => {
          console.log('Registration success:', response);
          this.message = 'Registration successful! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Registration error:', err);
          this.errorMessage = err.error?.message || 'An error occurred during registration. Please try again.';
        }
      });
  }
}
