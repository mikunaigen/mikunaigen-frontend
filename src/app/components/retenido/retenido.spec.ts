import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RetenidoComponent } from './retenido';
import { environment } from '@env/environment';

describe('RetenidoComponent', () => {
  let fixture: ComponentFixture<RetenidoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetenidoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RetenidoComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('HU-04: consulta el estado de bloqueo por IP', () => {
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/ip-status`);
    expect(req.request.method).toBe('GET');
    req.flush({ blocked: true, ipAddress: '127.0.0.1', remainingSeconds: 3600 });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
