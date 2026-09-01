import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const employeeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isEmployee()) {
    return true;
  }

  console.warn('Unauthorized access to employee route, redirecting to login...');
  router.navigate(['/login']);
  return false;
};
