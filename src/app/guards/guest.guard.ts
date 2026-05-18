import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  const path = auth.getPostLoginPath();
  const q = auth.getPostLoginQueryParams();
  return router.createUrlTree([path], q ? { queryParams: q } : {});
};
