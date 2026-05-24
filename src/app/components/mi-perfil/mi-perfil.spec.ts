import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MiPerfilComponent } from './mi-perfil';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('MiPerfilComponent', () => {
  let fixture: ComponentFixture<MiPerfilComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.setItem(
      'rb_auth',
      JSON.stringify({ token: tokenValido(), email: 'test@gmail.com', role: 'estudiante', userId: '1' }),
    );
    await TestBed.configureTestingModule({
      imports: [MiPerfilComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'mi-perfil', component: DummyComponent },
          { path: 'usuario-home', component: DummyComponent },
        ]),
        AuthService,
        { provide: WebsocketService, useValue: { subscribeToTopic: () => of({}) } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MiPerfilComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.match(() => true).forEach((req) => {
      if (req.request.url.includes('/preferencias')) {
        req.flush({
          rol: 'estudiante',
          capacidades: { puedePresupuesto: false },
          preferencias: { enfoquePrincipal: 'maxima_precision_nutricional' },
        });
      } else {
        req.flush({
          nombres: 'Ana',
          apellidos: 'Pérez',
          email: 'test@gmail.com',
          role: 'estudiante',
        });
      }
    });
  });

  it('HU-05: crea la pantalla de perfil personal', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
