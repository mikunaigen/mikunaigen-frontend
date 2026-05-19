import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const loginAccesoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.obtenerEstadoUsuarios().pipe(
    map((res) => {
      if (!res.hayUsuarios) {
        return router.createUrlTree(['/registro']);
      }
      return true;
    }),
    catchError(() => of(true)),
  );
};
