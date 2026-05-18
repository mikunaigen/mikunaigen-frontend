import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const cajaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getSession()?.role;
  if (role === 'CAJERO' || role === 'ADMIN') {
    return true;
  }
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: '/caja' } });
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: '/caja' } });
};
