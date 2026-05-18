import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { IpStatusService } from '../services/ip-status.service';

export const ipBlockGuard: CanActivateFn = () => {
  const ipStatus = inject(IpStatusService);
  const router = inject(Router);

  return ipStatus.obtenerEstado().pipe(
    map((res) => (res.blocked ? router.createUrlTree(['/retenido']) : true)),
    catchError(() => of(true)),
  );
};

