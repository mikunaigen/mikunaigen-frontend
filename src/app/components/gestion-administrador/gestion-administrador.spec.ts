import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAdministrador } from './gestion-administrador';

describe('GestionAdministrador', () => {
  let component: GestionAdministrador;
  let fixture: ComponentFixture<GestionAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAdministrador],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionAdministrador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
