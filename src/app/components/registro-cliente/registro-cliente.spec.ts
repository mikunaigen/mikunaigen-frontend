import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegistroClienteComponent } from './registro-cliente';

describe('RegistroClienteComponent', () => {
  let fixture: ComponentFixture<RegistroClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroClienteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroClienteComponent);
    await fixture.whenStable();
  });

  it('HU-01: crea el componente legacy de registro cliente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
