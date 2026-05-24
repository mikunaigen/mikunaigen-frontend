import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CrearPersonalComponent } from './crear-personal';

describe('CrearPersonalComponent', () => {
  let fixture: ComponentFixture<CrearPersonalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPersonalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearPersonalComponent);
    await fixture.whenStable();
  });

  it('HU-07: crea el formulario de personal', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
