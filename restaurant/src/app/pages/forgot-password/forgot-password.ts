import { Component, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Flow step: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  step: 1 | 2 | 3 | 4 = 1;

  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';

  // Kept in short-lived memory ONLY - never stored in localStorage, sessionStorage, or logs
  private resetToken = '';

  loading = false;
  errorMessage = '';
  infoMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  ngOnDestroy(): void {
    this.clearCooldown();
    this.resetToken = '';
  }

  // Password Policy Checks (aligned with backend)
  get isMinLength(): boolean {
    return !!this.newPassword && this.newPassword.length >= 6;
  }

  get isMaxLength(): boolean {
    return !!this.newPassword && this.newPassword.length <= 32;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword || '');
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword || '');
  }

  get hasSpecialChar(): boolean {
    return /[^a-zA-Z0-9]/.test(this.newPassword || '');
  }

  get passwordsMatch(): boolean {
    return !!this.newPassword && !!this.confirmPassword && this.newPassword === this.confirmPassword;
  }

  get isPasswordValid(): boolean {
    return this.isMinLength && this.isMaxLength && this.hasUppercase && this.hasNumber && this.hasSpecialChar && this.passwordsMatch;
  }

  get maskedEmail(): string {
    if (!this.email || !this.email.includes('@')) return this.email;
    const parts = this.email.split('@');
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return name[0] + '*@' + domain;
    return name.slice(0, 2) + '*'.repeat(Math.min(name.length - 2, 5)) + '@' + domain;
  }

  // Step 1: Submit Email
  onSendOtp(): void {
    this.errorMessage = '';
    this.infoMessage = '';
    if (!this.email || !this.email.trim()) {
      this.errorMessage = 'Please enter your registered email address.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.email.trim())
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.step = 2;
          this.infoMessage = res?.message || 'If an account with that email exists, a verification code has been sent.';
          this.startCooldown(60);
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 429) {
            this.errorMessage = err.error?.message || 'Please wait before requesting another verification code.';
          } else if (err.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please try again later.';
          } else {
            this.errorMessage = err.error?.message || 'Unable to process your request. Please try again later.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  // Step 2: Verify OTP
  onVerifyOtp(): void {
    this.errorMessage = '';
    this.infoMessage = '';

    const cleanOtp = (this.otp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      this.errorMessage = 'Please enter a valid 6-digit numeric verification code.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService.verifyOtp(this.email.trim(), cleanOtp)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          if (res && res.resetToken) {
            this.resetToken = res.resetToken;
            this.step = 3;
            this.infoMessage = 'Code verified successfully. Please enter your new password.';
            this.clearCooldown();
          } else {
            this.errorMessage = 'Verification succeeded, but no reset token was received. Please try again.';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 400) {
            this.errorMessage = err.error?.message || 'Invalid or expired verification code.';
          } else if (err.status === 429) {
            this.errorMessage = err.error?.message || 'Maximum attempts exceeded. Please request a new code.';
          } else if (err.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please try again later.';
          } else {
            this.errorMessage = err.error?.message || 'Verification failed. Please try again.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  // Resend OTP
  onResendOtp(): void {
    if (this.cooldownSeconds > 0 || this.loading) return;

    this.errorMessage = '';
    this.infoMessage = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.email.trim())
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.infoMessage = res?.message || 'A new verification code has been sent if an account exists.';
          this.startCooldown(60);
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 429) {
            this.errorMessage = err.error?.message || 'Please wait before requesting another code.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to resend verification code. Please try again.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  // Step 3: Reset Password
  onResetPassword(): void {
    this.errorMessage = '';
    this.infoMessage = '';

    if (!this.resetToken) {
      this.errorMessage = 'Reset session has expired. Please restart the password reset process.';
      this.step = 1;
      return;
    }

    if (!this.isPasswordValid) {
      this.errorMessage = 'Please ensure your new password satisfies all requirements and matches the confirmation.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService.resetPassword({
      resetToken: this.resetToken,
      newPassword: this.newPassword.trim()
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.resetToken = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.step = 4; // Success screen
          this.infoMessage = res?.message || 'Your password has been reset successfully.';
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 400) {
            this.errorMessage = err.error?.message || 'Invalid or expired session. Please start over.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to reset password. Please try again.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  goToStep1(): void {
    this.step = 1;
    this.otp = '';
    this.resetToken = '';
    this.errorMessage = '';
    this.infoMessage = '';
    this.clearCooldown();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private startCooldown(seconds: number): void {
    this.clearCooldown();
    this.cooldownSeconds = seconds;
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        this.clearCooldown();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.cooldownSeconds = 0;
  }
}
