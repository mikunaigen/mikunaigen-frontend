import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminDatasetAlimentosComponent } from './admin-dataset-alimentos';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('AdminDatasetAlimentosComponent', () => {
  let fixture: ComponentFixture<AdminDatasetAlimentosComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.setItem(
      'rb_auth',
      JSON.stringify({ token: tokenValido(), email: 'admin@gmail.com', role: 'administrador' }),
    );
    await TestBed.configureTestingModule({
      imports: [AdminDatasetAlimentosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin-dataset-alimentos', component: DummyComponent }]),
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminDatasetAlimentosComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.match(() => true).forEach((req) => req.flush({ vacio: true, total: 0 }));
  });

  it('HU-22: crea la gestión del dataset MINSA', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
