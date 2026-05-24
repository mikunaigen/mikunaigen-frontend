import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PanelCajaComponent } from './panel-caja';

describe('PanelCajaComponent', () => {
  let fixture: ComponentFixture<PanelCajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCajaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelCajaComponent);
    await fixture.whenStable();
  });

  it('crea el panel de caja legacy', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
