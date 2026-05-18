import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroAdmin } from './registro-admin';

describe('RegistroAdmin', () => {
  let component: RegistroAdmin;
  let fixture: ComponentFixture<RegistroAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
