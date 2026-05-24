import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GestionAdministradorComponent } from './gestion-administrador';

describe('GestionAdministradorComponent', () => {
  let fixture: ComponentFixture<GestionAdministradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAdministradorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionAdministradorComponent);
    await fixture.whenStable();
  });

  it('HU-07: crea el panel de administración', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
