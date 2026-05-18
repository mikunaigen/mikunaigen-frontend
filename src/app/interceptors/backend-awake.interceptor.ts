import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { BackendStatusService } from '../services/backend-status.service';

function isPingUrl(url: string): boolean {
  const base = url.split('?')[0].split('#')[0];
  return base.endsWith('/ping') || base.includes('/api/ping');
}

function shouldWakeBackend(error: unknown, reqUrl: string): boolean {
  if (isPingUrl(reqUrl)) return false;
  if (!(error instanceof HttpErrorResponse)) return false;
  const maint = (error.headers?.get('X-Maintenance') || '').toLowerCase() === 'true';
  if (maint) return false;
  const s = error.status;
  return s === 0 || s === 502 || s === 503 || s === 504;
}

export const backendAwakeInterceptor: HttpInterceptorFn = (req, next) => {
  const backendStatus = inject(BackendStatusService);

  if (isPingUrl(req.url)) {
    return next(req);
  }

  const attempt = (): Observable<HttpEvent<unknown>> =>
    next(req).pipe(
      catchError((error: unknown) => {
        if (!shouldWakeBackend(error, req.url)) {
          return throwError(() => error);
        }
        return backendStatus.waitUntilAwake().pipe(switchMap(attempt));
      }),
    );

  return attempt();
};
