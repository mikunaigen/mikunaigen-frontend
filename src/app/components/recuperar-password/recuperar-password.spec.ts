import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RecuperarPasswordComponent } from './recuperar-password';

describe('RecuperarPasswordComponent', () => {
  let fixture: ComponentFixture<RecuperarPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPasswordComponent);
    await fixture.whenStable();
  });

  it('HU-03: crea el formulario de recuperación de contraseña', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
