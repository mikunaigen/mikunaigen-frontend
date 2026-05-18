import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { FrontendErrorReporterService } from '../services/frontend-error-reporter.service';

function isIgnoredUrl(url: string): boolean {
  return url.includes('/api/client-errors/report') || url.includes('/api/ping');
}

export const frontendErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const reporter = inject(FrontendErrorReporterService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isIgnoredUrl(req.url)) {
        const http = error instanceof HttpErrorResponse ? error : undefined;
        reporter.report({
          level: 'ERROR',
          source: 'http',
          message: http?.message || `HTTP error en ${req.method} ${req.url}`,
          stack: toText(http?.error),
          requestUrl: req.url,
          requestMethod: req.method,
          httpStatus: http?.status,
        });
      }
      return throwError(() => error);
    }),
  );
};

function toText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
