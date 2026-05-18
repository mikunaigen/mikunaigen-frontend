import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupInicial } from './setup-inicial';

describe('SetupInicial', () => {
  let component: SetupInicial;
  let fixture: ComponentFixture<SetupInicial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupInicial],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupInicial);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
