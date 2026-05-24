import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ipBlockGuard } from './ip-block.guard';
import { IpStatusService } from '../services/ip-status.service';
import { environment } from '@env/environment';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('ipBlockGuard', () => {
  let router: Router;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'retenido', component: DummyComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        IpStatusService,
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
      ipBlockGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('HU-04: permite acceso cuando la IP no está bloqueada', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    req.flush({ blocked: false, ipAddress: '10.0.0.1', remainingSeconds: 0 });
    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it('HU-04: redirige a retenido cuando la IP está bloqueada', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    req.flush({ blocked: true, ipAddress: '10.0.0.1', remainingSeconds: 300 });
    const result = await resultPromise;
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/retenido');
  });

  it('HU-04: permite acceso si falla la consulta HTTP', async () => {
    const guardResult = runGuard();
    const resultPromise = firstValueFrom(guardResult as import('rxjs').Observable<unknown>);
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    req.error(new ProgressEvent('error'));
    const result = await resultPromise;
    expect(result).toBe(true);
  });
});
