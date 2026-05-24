import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('adminGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), AuthService],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('HU-07: permite acceso a administrador', () => {
    // Arrange
    auth.setSession({ token: tokenValido(), role: 'administrador' });

    // Act
    const result = runGuard();

    // Assert
    expect(result).toBe(true);
  });

  it('HU-07: redirige roles no admin al panel correspondiente', () => {
    // Arrange
    auth.setSession({ token: tokenValido(), role: 'estudiante' });

    // Act
    const result = runGuard();

    // Assert
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/usuario-home');
  });
});
