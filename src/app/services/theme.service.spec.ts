import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThemeService } from './theme.service';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('ThemeService', () => {
  let service: ThemeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ThemeService, AuthService],
    });
    service = TestBed.inject(ThemeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('HU-26: toggle aplica y quita la clase dark en el documento', () => {
    // Arrange
    expect(service.isDark()).toBe(false);

    // Act
    service.toggle();

    // Assert
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Act
    service.toggle();

    // Assert
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('HU-26: persistLoginTheme aplica tema y envía PATCH al backend', () => {
    // Arrange
    const email = 'usuario@gmail.com';

    // Act
    service.persistLoginTheme(true, email);
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/dark-mode`);

    // Assert
    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem('rb_theme_dark')).toBe('1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ email, darkMode: true });
    req.flush({});
  });

  it('HU-26: toggle con sesión activa persiste preferencia y sincroniza dark-mode', () => {
    // Arrange
    const auth = TestBed.inject(AuthService);
    auth.setSession({ token: tokenValido(), email: 'user@gmail.com', darkMode: false });

    // Act
    service.toggle();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/dark-mode`);
    req.flush({});

    // Assert
    expect(service.isDark()).toBe(true);
    expect(auth.getSession()?.darkMode).toBe(true);
    expect(localStorage.getItem('rb_theme_dark')).toBe('1');
  });
});
