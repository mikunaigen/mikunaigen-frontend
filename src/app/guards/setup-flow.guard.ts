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
      if (!res.configuracionCompleta) {
        return true;
      }

      if (forzarEdicion) {
        if (!auth.esAdministrador()) {
          return router.createUrlTree(['/presentacion']);
        }
        return true;
      }

      if (auth.esAdministrador()) {
        return router.createUrlTree(['/gestion-administrador']);
      }

      return router.createUrlTree(['/presentacion']);
    }),
    catchError(() => of(true)),
  );
};
