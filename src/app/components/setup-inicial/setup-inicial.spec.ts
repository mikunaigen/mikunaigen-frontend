import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SetupInicialComponent } from './setup-inicial';

describe('SetupInicialComponent', () => {
  let fixture: ComponentFixture<SetupInicialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupInicialComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupInicialComponent);
    await fixture.whenStable();
  });

  it('HU-33: crea el asistente de configuración SMTP', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
