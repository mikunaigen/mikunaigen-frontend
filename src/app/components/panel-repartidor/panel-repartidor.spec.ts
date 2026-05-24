import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PanelRepartidorComponent } from './panel-repartidor';

describe('PanelRepartidorComponent', () => {
  let fixture: ComponentFixture<PanelRepartidorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelRepartidorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelRepartidorComponent);
    await fixture.whenStable();
  });

  it('crea el panel de repartidor legacy', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
