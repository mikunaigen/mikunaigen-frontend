import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('LoginComponent integración', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: LoginComponent }]),
        AuthService,
        ConfigService,
        ThemeService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/configuracion`).flush({});
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('HU-02: credenciales válidas guardan sesión tras respuesta del backend', () => {
    const comp = fixture.componentInstance;
    comp.email = 'ana@gmail.com';
    comp.password = 'Secret1!';

    comp.onLogin();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@gmail.com', password: 'Secret1!' });
    req.flush({
      token: tokenValido(),
      email: 'ana@gmail.com',
      role: 'estudiante',
      darkMode: false,
      firstLogin: false,
    });
    httpMock.expectOne(`${environment.apiUrl}/auth/dark-mode`).flush({});

    const auth = TestBed.inject(AuthService);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.getSession()?.email).toBe('ana@gmail.com');
  });

  it('HU-02: credenciales inválidas muestran modal de error', () => {
    const comp = fixture.componentInstance;
    comp.email = 'ana@gmail.com';
    comp.password = 'wrong';

    comp.onLogin();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: 'Contraseña incorrecta.', failedAttempts: 1 }, { status: 401, statusText: 'Unauthorized' });

    expect(comp.modal.visible).toBe(true);
    expect(comp.modal.esError).toBe(true);
    expect(comp.modal.mensaje).toContain('Intento 1/3');
  });

  it('HU-02: campos vacíos no envían petición HTTP', () => {
    const comp = fixture.componentInstance;
    comp.email = '';
    comp.password = '';

    comp.onLogin();

    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    expect(comp.modal.titulo).toBe('Campos Vacíos');
  });
});
