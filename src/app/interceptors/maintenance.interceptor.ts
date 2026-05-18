import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MaintenanceService } from '../services/maintenance.service';

function isMaintenanceError(e: HttpErrorResponse): boolean {
  return e.status === 503 && (e.headers?.get('X-Maintenance') || '').toLowerCase() === 'true';
}

export const maintenanceInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const maintenance = inject(MaintenanceService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error instanceof HttpErrorResponse && isMaintenanceError(error)) {
        maintenance.start();
        if (router.url !== '/mantenimiento') {
          void router.navigate(['/mantenimiento']);
        }
      }
      return throwError(() => error);
    }),
  );
};

