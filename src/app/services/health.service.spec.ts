import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http'; 
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        HealthService
      ]
    });
    service = TestBed.inject(HealthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});