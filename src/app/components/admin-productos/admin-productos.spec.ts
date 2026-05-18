import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AdminProductosComponent } from './admin-productos';

describe('AdminProductosComponent', () => {
  let component: AdminProductosComponent;
  let fixture: ComponentFixture<AdminProductosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductosComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
