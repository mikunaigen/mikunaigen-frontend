import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

export const setupFlowGuard: CanActivateFn = (route) => {
  const config = inject(ConfigService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const forzarEdicion = route.queryParamMap.get('editar') === '1';

  return config.obtenerEstado().pipe(
    map((res) => {
      if (!res.configuracionCompleta) return true;

      const role = auth.getSession()?.role;
      if (role !== 'ADMIN') return router.createUrlTree([auth.getPostLoginPath()]);
      if (!forzarEdicion) return router.createUrlTree(['/gestion-administrador']);
      return true;
    }),
    catchError(() => of(true)),
  );
};

