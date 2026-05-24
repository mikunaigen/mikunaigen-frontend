import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PanelCocinaComponent } from './panel-cocina';

describe('PanelCocinaComponent', () => {
  let fixture: ComponentFixture<PanelCocinaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCocinaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelCocinaComponent);
    await fixture.whenStable();
  });

  it('crea el panel de cocina legacy', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
