import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  const role = authService.getRole().toUpperCase();
  if (role === 'CUSTOMER' || role === '') {
    return true;
  }

  // Non-customer staff roles are redirected to their designated workspace
  const targetUrl = authService.getPermittedUrlForRole(role);
  console.warn(`Staff user (${role}) attempted to access customer route ${state.url}, redirecting to ${targetUrl}`);
  router.navigate([targetUrl]);
  return false;
};
