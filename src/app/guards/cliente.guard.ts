import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const clienteGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    const returnUrl = state.url || '/usuario-home';
    return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
  }
  const s = auth.getSession();
  if (s?.firstLogin === true) {
    return router.createUrlTree(['/confirmar-cuenta'], {
      queryParams: auth.getPostLoginQueryParams(),
    });
  }
  if (!auth.esUsuarioFormulacion(s?.role) && !auth.esAdministrador(s?.role)) {
    return router.createUrlTree([auth.getPostLoginPath()]);
  }
  return true;
};
