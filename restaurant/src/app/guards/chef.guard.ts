import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const chefGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isChef()) {
    return true;
  }

  console.warn('Unauthorized access to chef route, redirecting to login...');
  router.navigate(['/login']);
  return false;
};
