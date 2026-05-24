import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { clienteGuard } from './cliente.guard';
import { AuthService } from '../services/auth.service';

describe('clienteGuard', () => {
  it('HU-08: redirige al login si no hay sesión', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        { provide: Router, useValue: { createUrlTree: (cmds: string[], opts?: { queryParams?: Record<string, string> }) => ({ cmds, opts }) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      clienteGuard({} as never, { url: '/objetivo-nutricional' } as never),
    );

    expect(result).toEqual({
      cmds: ['/login'],
      opts: { queryParams: { returnUrl: '/objetivo-nutricional' } },
    });
  });
});
