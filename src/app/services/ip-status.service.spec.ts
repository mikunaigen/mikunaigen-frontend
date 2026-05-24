import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IpStatusService } from './ip-status.service';
import { environment } from '@env/environment';

describe('IpStatusService', () => {
  let service: IpStatusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IpStatusService],
    });
    service = TestBed.inject(IpStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('HU-04: consulta el estado de bloqueo por IP', () => {
    // Arrange
    const mock = { blocked: true, ipAddress: '192.168.1.1', remainingSeconds: 120 };
    let resultado: typeof mock | undefined;

    // Act
    service.obtenerEstado().subscribe((res) => (resultado = res));
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    req.flush(mock);

    // Assert
    expect(req.request.method).toBe('GET');
    expect(resultado).toEqual(mock);
  });
});
