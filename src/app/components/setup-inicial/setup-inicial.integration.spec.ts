import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SetupInicialComponent } from './setup-inicial';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { environment } from '@env/environment';

describe('SetupInicialComponent integración', () => {
  let fixture: ComponentFixture<SetupInicialComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SetupInicialComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: SetupInicialComponent }]),
        AuthService,
        ConfigService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupInicialComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/configuracion`).flush({
      configuracionCompleta: false,
      smtpPasswordConfigured: false,
    });
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('HU-34: yape con formato inválido no envía petición al backend', () => {
    const comp = fixture.componentInstance;
    comp.config.emailSmtp = 'admin@gmail.com';
    comp.config.passwordSmtp = '1234567890123456';
    comp.config.nombreNegocio = 'Mikunaigen';
    comp.config.telefonoNegocio = '912345678';
    comp.config.logoBase64 = 'data:image/png;base64,abc';
    comp.config.terminosCondiciones = 'Términos válidos de prueba para la plataforma Mikunaigen.';
    comp.codigoVerificacion = '123456';
    comp.config.mediosPago.yapeActivo = true;
    comp.config.mediosPago.yapeTelefono = '123';

    comp.guardar();

    httpMock.expectNone(`${environment.apiUrl}/configuracion/validar-y-guardar`);
    expect(comp.modal.titulo).toBe('Yape inválido');
    expect(comp.modal.esError).toBe(true);
  });

  it('HU-33: email SMTP fuera de Gmail muestra error antes de llamar al servicio', () => {
    const comp = fixture.componentInstance;
    comp.config.emailSmtp = 'admin@empresa.com';
    comp.config.passwordSmtp = '1234567890123456';

    comp.enviarCodigo();

    httpMock.expectNone(`${environment.apiUrl}/configuracion/enviar-verificacion`);
    expect(comp.modal.esError).toBe(true);
  });
});
