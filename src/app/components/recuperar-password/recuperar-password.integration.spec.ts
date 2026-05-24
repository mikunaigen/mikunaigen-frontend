import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RecuperarPasswordComponent } from './recuperar-password';
import { environment } from '@env/environment';

describe('RecuperarPasswordComponent integración', () => {
  let fixture: ComponentFixture<RecuperarPasswordComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPasswordComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('HU-03: email no registrado muestra error del backend', () => {
    const comp = fixture.componentInstance;
    comp.email = 'desconocido@gmail.com';

    comp.enviarCodigo();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/enviar-codigo-recuperacion`);
    expect(req.request.body).toEqual({ email: 'desconocido@gmail.com' });
    req.flush({ message: 'Correo no registrado.' }, { status: 400, statusText: 'Bad Request' });

    expect(comp.modal.visible).toBe(true);
    expect(comp.modal.esError).toBe(true);
    expect(comp.modal.mensaje).toBe('Correo no registrado.');
  });

  it('HU-03: código vencido al restablecer muestra error', () => {
    const comp = fixture.componentInstance;
    comp.paso = 2;
    comp.email = 'user@gmail.com';
    comp.codigo = '123456';
    comp.nuevaPassword = 'NuevaPass1!';
    comp.confirmarPassword = 'NuevaPass1!';

    comp.resetearPassword();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
    req.flush({ message: 'El código ha expirado.' }, { status: 400, statusText: 'Bad Request' });

    expect(comp.modal.esError).toBe(true);
    expect(comp.modal.mensaje).toBe('El código ha expirado.');
  });
});
