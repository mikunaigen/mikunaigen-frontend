import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { configRequiredGuard } from './config-required.guard';
import { ConfigService } from '../services/config.service';
import { environment } from '@env/environment';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('configRequiredGuard', () => {
  let router: Router;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'setup', component: DummyComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfigService,
      ],
    });
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      configRequiredGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('HU-33: permite acceso cuando la configuración está completa', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/configuracion/estado`);
    req.flush({ configuracionCompleta: true });
    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it('HU-33: redirige a setup cuando falta configuración', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/configuracion/estado`);
    req.flush({ configuracionCompleta: false });
    const result = await resultPromise;
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/setup');
  });

  it('HU-33: redirige a setup ante error HTTP', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/configuracion/estado`);
    req.error(new ProgressEvent('error'));
    const result = await resultPromise;
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/setup');
  });
});
