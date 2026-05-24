import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegistroAdminComponent } from './registro-admin';

describe('RegistroAdminComponent', () => {
  let fixture: ComponentFixture<RegistroAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroAdminComponent);
    await fixture.whenStable();
  });

  it('HU-01: crea el registro de administrador inicial', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
