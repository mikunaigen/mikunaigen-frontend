import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelCaja } from './panel-caja';

describe('PanelCaja', () => {
  let component: PanelCaja;
  let fixture: ComponentFixture<PanelCaja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCaja],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelCaja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
