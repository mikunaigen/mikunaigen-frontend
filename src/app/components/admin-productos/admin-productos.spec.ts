import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminProductosComponent } from './admin-productos';

describe('AdminProductosComponent', () => {
  let fixture: ComponentFixture<AdminProductosComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminProductosComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({}));
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
