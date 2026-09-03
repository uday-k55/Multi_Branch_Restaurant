import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const chefGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isChef()) {
    return true;
  }

  const targetUrl = authService.getPermittedUrlForRole();
  console.warn(`Unauthorized access to chef route by ${authService.getRole()}, redirecting to ${targetUrl}`);
  router.navigate([targetUrl]);
  return false;
};
