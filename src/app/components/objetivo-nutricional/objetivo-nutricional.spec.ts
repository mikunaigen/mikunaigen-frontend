import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ObjetivoNutricionalComponent } from './objetivo-nutricional';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('ObjetivoNutricionalComponent', () => {
  let fixture: ComponentFixture<ObjetivoNutricionalComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.setItem(
      'rb_auth',
      JSON.stringify({ token: tokenValido(), email: 'test@gmail.com', role: 'estudiante' }),
    );
    await TestBed.configureTestingModule({
      imports: [ObjetivoNutricionalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'objetivo-nutricional', component: DummyComponent },
        ]),
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ObjetivoNutricionalComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.match(() => true).forEach((req) => req.flush({ campos: [], perfilesEjemplo: [] }));
  });

  it('HU-08: crea el formulario de objetivo nutricional', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
