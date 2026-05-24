import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '@env/environment';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    void router.navigateByUrl('/');
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('HU-02: agrega Authorization Bearer cuando hay token válido', () => {
    // Arrange
    auth.setSession({ token: tokenValido(), role: 'estudiante' });
    const url = `${environment.apiUrl}/auth/perfil`;

    // Act
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);

    // Assert
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${tokenValido()}`);
    req.flush({});
  });

  it('HU-02: no agrega Authorization sin sesión', () => {
    // Arrange
    const url = `${environment.apiUrl}/auth/estado-usuarios`;

    // Act
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);

    // Assert
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('HU-02: ante 401 limpia sesión y redirige a login', async () => {
    // Arrange
    auth.setSession({ token: tokenValido(), role: 'estudiante' });
    const url = `${environment.apiUrl}/auth/perfil`;
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Act
    http.get(url).subscribe({ error: () => {} });
    const req = httpMock.expectOne(url);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => expect(navigateSpy).toHaveBeenCalledWith(['/login']));

    // Assert
    expect(auth.getSession()).toBeNull();
  });
});
