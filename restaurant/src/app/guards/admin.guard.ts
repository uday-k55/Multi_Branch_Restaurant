import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin() || authService.isBranchManager()) {
    return true;
  }

  console.warn('Unauthorized access to admin/manager route, redirecting to login...');
  router.navigate(['/login']);
  return false;
};
