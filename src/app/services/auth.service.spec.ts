import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, EstadoUsuariosDto } from './auth.service';
import { environment } from '@env/environment';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

function tokenExpirado(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
  return `header.${payload}.sig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('isLoggedIn', () => {
    it('HU-02: retorna false sin sesión o con token expirado', () => {
      // Arrange & Act
      const sinSesion = service.isLoggedIn();

      service.setSession({ token: tokenExpirado(), role: 'estudiante' });
      const conExpirado = service.isLoggedIn();

      // Assert
      expect(sinSesion).toBe(false);
      expect(conExpirado).toBe(false);
      expect(service.getSession()).toBeNull();
    });

    it('HU-02: retorna true con token válido', () => {
      // Arrange
      service.setSession({ token: tokenValido(), role: 'estudiante' });

      // Act
      const loggedIn = service.isLoggedIn();

      // Assert
      expect(loggedIn).toBe(true);
    });
  });

  describe('getPostLoginPath', () => {
    it('HU-02: redirige según rol y firstLogin', () => {
      // Arrange & Act & Assert
      expect(service.getPostLoginPath()).toBe('/login');

      service.setSession({ token: tokenValido(), firstLogin: true, email: 'a@gmail.com' });
      expect(service.getPostLoginPath()).toBe('/confirmar-cuenta');

      service.setSession({ token: tokenValido(), role: 'administrador' });
      expect(service.getPostLoginPath()).toBe('/gestion-administrador');

      service.setSession({ token: tokenValido(), role: 'ADMIN' });
      expect(service.getPostLoginPath()).toBe('/gestion-administrador');

      service.setSession({ token: tokenValido(), role: 'estudiante' });
      expect(service.getPostLoginPath()).toBe('/usuario-home');

      service.setSession({ token: tokenValido(), role: 'CLIENTE' });
      expect(service.getPostLoginPath()).toBe('/usuario-home');
    });
  });

  describe('obtenerEstadoUsuarios', () => {
    it('HU-02: consulta el estado de usuarios vía HTTP', () => {
      // Arrange
      const mock: EstadoUsuariosDto = { hayUsuarios: true, sinUsuarios: false, hasAdmin: true };
      let resultado: EstadoUsuariosDto | undefined;

      // Act
      service.obtenerEstadoUsuarios().subscribe((res) => (resultado = res));
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/estado-usuarios`);
      req.flush(mock);

      // Assert
      expect(req.request.method).toBe('GET');
      expect(resultado).toEqual(mock);
    });
  });
});
