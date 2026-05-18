import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarCuenta } from './confirmar-cuenta';

describe('ConfirmarCuenta', () => {
  let component: ConfirmarCuenta;
  let fixture: ComponentFixture<ConfirmarCuenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarCuenta],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarCuenta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
