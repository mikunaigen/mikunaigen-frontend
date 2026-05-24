import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RetenidoComponent } from './retenido';
import { IpStatusService } from '../../services/ip-status.service';
import { environment } from '@env/environment';

describe('RetenidoComponent integración', () => {
  let fixture: ComponentFixture<RetenidoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetenidoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: RetenidoComponent }]),
        IpStatusService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RetenidoComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('HU-04: IP bloqueada muestra dirección y tiempo restante', async () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    req.flush({ blocked: true, ipAddress: '192.168.1.10', remainingSeconds: 3600 });

    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.ipAddress).toBe('192.168.1.10');
    expect(comp.remainingSeconds).toBe(3600);
    expect(comp.cargando).toBe(false);
  });
});
