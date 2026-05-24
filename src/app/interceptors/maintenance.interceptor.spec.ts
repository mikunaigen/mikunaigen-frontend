import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { maintenanceInterceptor } from './maintenance.interceptor';
import { MaintenanceService } from '../services/maintenance.service';
import { AuthService } from '../services/auth.service';
import { environment } from '@env/environment';

describe('maintenanceInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let maintenance: MaintenanceService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([maintenanceInterceptor])),
        provideHttpClientTesting(),
        MaintenanceService,
        AuthService,
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    maintenance = TestBed.inject(MaintenanceService);
    router = TestBed.inject(Router);
    void router.navigateByUrl('/');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('redirige a mantenimiento ante 503 con X-Maintenance', async () => {
    // Arrange
    const url = `${environment.apiUrl}/health`;
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Act
    http.get(url).subscribe({ error: () => {} });
    const req = httpMock.expectOne(url);
    req.flush('Service Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'X-Maintenance': 'true' },
    });
    await vi.waitFor(() => expect(navigateSpy).toHaveBeenCalledWith(['/mantenimiento']));

    // Assert
    expect(maintenance.active()).toBe(true);
  });

  it('no activa mantenimiento ante 503 sin cabecera X-Maintenance', () => {
    // Arrange
    const url = `${environment.apiUrl}/health`;
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Act
    http.get(url).subscribe({ error: () => {} });
    const req = httpMock.expectOne(url);
    req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

    // Assert
    expect(maintenance.active()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalledWith(['/mantenimiento']);
  });
});
