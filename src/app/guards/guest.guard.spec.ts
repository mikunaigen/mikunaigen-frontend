import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('guestGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'gestion-administrador', component: DummyComponent },
          { path: 'confirmar-cuenta', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
        AuthService,
      ],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('HU-02: permite acceso a invitados sin sesión', () => {
    expect(runGuard()).toBe(true);
  });

  it('HU-02: redirige usuarios autenticados según getPostLoginPath', () => {
    auth.setSession({ token: tokenValido(), role: 'administrador' });
    const result = runGuard();
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/gestion-administrador');
  });

  it('HU-02: incluye queryParams en firstLogin', () => {
    auth.setSession({
      token: tokenValido(),
      firstLogin: true,
      email: 'nuevo@gmail.com',
      role: 'estudiante',
    });
    const result = runGuard();
    expect(result).not.toBe(true);
    const url = router.serializeUrl(result as ReturnType<Router['createUrlTree']>);
    expect(url).toContain('/confirmar-cuenta');
    expect(url).toContain('email=nuevo');
  });
});
