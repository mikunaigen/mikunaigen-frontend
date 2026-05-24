import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { frontendErrorInterceptor } from './frontend-error.interceptor';
import { FrontendErrorReporterService } from '../services/frontend-error-reporter.service';

describe('frontendErrorInterceptor', () => {
  const report = vi.fn();

  beforeEach(() => {
    report.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FrontendErrorReporterService, useValue: { report } },
      ],
    });
  });

  it('HU-28: reporta errores HTTP al servicio de errores del cliente', () => {
    const req = new HttpRequest('GET', '/api/formulacion/objetivo-nutricional/campos');
    const next = () => throwError(() => new HttpErrorResponse({ status: 500, url: req.url }));

    TestBed.runInInjectionContext(() => {
      frontendErrorInterceptor(req, next).subscribe({
        error: () => {
          expect(report).toHaveBeenCalledTimes(1);
          expect(report.mock.calls[0][0].source).toBe('http');
        },
      });
    });
  });

  it('HU-28: no reporta errores del endpoint de ping', () => {
    const req = new HttpRequest('GET', '/api/ping');
    const next = () => throwError(() => new HttpErrorResponse({ status: 500, url: req.url }));

    TestBed.runInInjectionContext(() => {
      frontendErrorInterceptor(req, next).subscribe({
        error: () => {
          expect(report).not.toHaveBeenCalled();
        },
      });
    });
  });
});
