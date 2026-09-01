import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  profile = signal<UserProfile | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  editMode = signal<boolean>(false);

  // Edit fields
  firstName = signal<string>('');
  lastName = signal<string>('');
  phoneNumber = signal<string>('');
  gender = signal<string>('male');

  successMsg = signal<string>('');
  errorMsg = signal<string>('');

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/profile' } });
      return;
    }
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.authService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.firstName.set(data.firstName || '');
        this.lastName.set(data.lastName || '');
        this.phoneNumber.set(data.phoneNumber || '');
        this.gender.set(data.gender || 'male');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to load user profile.');
      }
    });
  }

  toggleEdit(): void {
    this.editMode.update(v => !v);
    this.clearMessages();
  }

  clearMessages(): void {
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  saveProfile(): void {
    this.clearMessages();
    if (!this.firstName().trim() || !this.lastName().trim()) {
      this.errorMsg.set('First name and last name are required.');
      return;
    }

    this.saving.set(true);
    const updatePayload: Partial<UserProfile> = {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      phoneNumber: this.phoneNumber().trim(),
      gender: this.gender()
    };

    this.authService.updateProfile(updatePayload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.profile.set(updated);
        this.editMode.set(false);
        this.successMsg.set('Profile updated successfully!');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to update profile.');
      }
    });
  }
}
