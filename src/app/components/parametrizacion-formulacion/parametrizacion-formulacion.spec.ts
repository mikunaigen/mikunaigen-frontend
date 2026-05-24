import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ParametrizacionFormulacionComponent } from './parametrizacion-formulacion';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('ParametrizacionFormulacionComponent', () => {
  let fixture: ComponentFixture<ParametrizacionFormulacionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.setItem(
      'rb_auth',
      JSON.stringify({ token: tokenValido(), email: 'test@gmail.com', role: 'estudiante' }),
    );
    await TestBed.configureTestingModule({
      imports: [ParametrizacionFormulacionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'parametrizacion', component: DummyComponent },
        ]),
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ParametrizacionFormulacionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.match(() => true).forEach((req) =>
      req.flush({ rol: 'estudiante', capacidades: {}, parametrizacion: {} }),
    );
  });

  it('HU-09: crea la parametrización de ingredientes', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
