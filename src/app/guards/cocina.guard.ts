import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const cocinaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getSession()?.role;
  if (role === 'COCINERO' || role === 'ADMIN') {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: '/cocina' } });
};
