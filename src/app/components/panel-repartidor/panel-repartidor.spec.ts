import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelRepartidor } from './panel-repartidor';

describe('PanelRepartidor', () => {
  let component: PanelRepartidor;
  let fixture: ComponentFixture<PanelRepartidor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelRepartidor],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelRepartidor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
