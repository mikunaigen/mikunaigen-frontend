import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigService } from './config.service';
import { environment } from '@env/environment';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/configuracion`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ConfigService],
    });
    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('HU-33: obtiene la configuración del negocio', () => {
    // Arrange
    let resultado: { emailSmtp?: string; configuracionCompleta?: boolean } | undefined;

    // Act
    service.obtenerConfiguracion().subscribe((res) => (resultado = res));
    const req = httpMock.expectOne(baseUrl);
    req.flush({
      configuracionCompleta: true,
      emailSmtp: 'negocio@gmail.com',
      smtpPasswordConfigured: true,
      nombreNegocio: 'Mikunaigen',
      telefonoNegocio: '999888777',
      terminosCondiciones: 'Términos vigentes',
      logoBase64: '',
      mediosPago: {
        yapeActivo: true,
        yapeTelefono: '999888777',
        plinActivo: false,
        plinTelefono: '',
        transferenciaActiva: false,
        transferencias: [],
      },
    });

    // Assert
    expect(req.request.method).toBe('GET');
    expect(resultado?.emailSmtp).toBe('negocio@gmail.com');
    expect(resultado?.configuracionCompleta).toBe(true);
  });

  it('HU-33: envía verificación SMTP', () => {
    // Arrange
    const body = { emailSmtp: 'smtp@gmail.com', passwordSmtp: 'abcdefghijklmnop' };
    let mensaje: string | undefined;

    // Act
    service.enviarVerificacion(body).subscribe((res) => (mensaje = res.message));
    const req = httpMock.expectOne(`${baseUrl}/enviar-verificacion`);
    req.flush({ message: 'Correo enviado' });

    // Assert
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(mensaje).toBe('Correo enviado');
  });

  it('HU-34: consulta estado y valida términos al guardar', () => {
    // Arrange
    let estadoCompleto: boolean | undefined;
    let guardado: { configuracionCompleta?: boolean } | undefined;
    const payload = { terminosCondiciones: 'Acepto condiciones', nombreNegocio: 'Local' };

    // Act
    service.obtenerEstado().subscribe((res) => (estadoCompleto = res.configuracionCompleta));
    const reqEstado = httpMock.expectOne(`${baseUrl}/estado`);
    reqEstado.flush({ configuracionCompleta: false });

    service.validarYGuardar(payload).subscribe((res) => (guardado = res));
    const reqGuardar = httpMock.expectOne(`${baseUrl}/validar-y-guardar`);
    reqGuardar.flush({ configuracionCompleta: true, message: 'OK' });

    // Assert
    expect(reqEstado.request.method).toBe('GET');
    expect(estadoCompleto).toBe(false);
    expect(reqGuardar.request.method).toBe('POST');
    expect(reqGuardar.request.body).toEqual(payload);
    expect(guardado?.configuracionCompleta).toBe(true);
  });
});
