import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { LocationPickerModalComponent, LocationSelectedResult } from '../../components/location-picker-modal/location-picker-modal';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LocationPickerModalComponent],
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
  address = signal<string>(localStorage.getItem('userAddress') || '');
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
  gettingLocation = signal<boolean>(false);
  locationError = signal<string>('');
  showMapPicker = signal<boolean>(false);

  openMapPicker(): void {
    this.locationError.set('');
    this.showMapPicker.set(true);
  }

  closeMapPicker(): void {
    this.showMapPicker.set(false);
  }

  onLocationChosenFromMap(result: LocationSelectedResult): void {
    this.showMapPicker.set(false);
    this.latitude.set(result.lat);
    this.longitude.set(result.lng);
    this.address.set(result.address);
    localStorage.setItem('userAddress', result.address);
  }

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
    this.locationError.set('');
  }

  useCurrentLocation(): void {
    this.locationError.set('');
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser.');
      return;
    }

    this.gettingLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.latitude.set(lat);
        this.longitude.set(lon);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
          .then(res => res.json())
          .then(data => {
            this.gettingLocation.set(false);
            if (data && data.display_name) {
              this.address.set(data.display_name);
              localStorage.setItem('userAddress', data.display_name);
            }
          })
          .catch(() => {
            this.gettingLocation.set(false);
            const addr = `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            this.address.set(addr);
            localStorage.setItem('userAddress', addr);
          });
      },
      (error) => {
        this.gettingLocation.set(false);
        this.locationError.set('Unable to retrieve your current location. Please enter your address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  saveProfile(): void {
    this.clearMessages();
    if (!this.firstName().trim() || !this.lastName().trim()) {
      this.errorMsg.set('First name and last name are required.');
      return;
    }

    if (this.address().trim()) {
      localStorage.setItem('userAddress', this.address().trim());
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
