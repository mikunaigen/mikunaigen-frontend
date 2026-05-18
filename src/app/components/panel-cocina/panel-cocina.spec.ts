import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelCocina } from './panel-cocina';

describe('PanelCocina', () => {
  let component: PanelCocina;
  let fixture: ComponentFixture<PanelCocina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCocina],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelCocina);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
