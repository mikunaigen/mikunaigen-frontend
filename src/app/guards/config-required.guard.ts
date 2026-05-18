import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ConfigService } from '../services/config.service';

export const configRequiredGuard: CanActivateFn = () => {
  const config = inject(ConfigService);
  const router = inject(Router);

  return config.obtenerEstado().pipe(
    map((res) => (res.configuracionCompleta ? true : router.createUrlTree(['/setup']))),
    catchError(() => of(router.createUrlTree(['/setup']))),
  );
};

