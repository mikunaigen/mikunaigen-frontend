import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearPersonal } from './crear-personal';

describe('CrearPersonal', () => {
  let component: CrearPersonal;
  let fixture: ComponentFixture<CrearPersonal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPersonal],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearPersonal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
