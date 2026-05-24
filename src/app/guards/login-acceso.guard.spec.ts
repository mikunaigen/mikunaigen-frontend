import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { loginAccesoGuard } from './login-acceso.guard';
import { AuthService } from '../services/auth.service';

describe('loginAccesoGuard', () => {
  it('HU-02: redirige a registro si no hay usuarios en el sistema', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            obtenerEstadoUsuarios: () => of({ hayUsuarios: false, sinUsuarios: true }),
          },
        },
        { provide: Router, useValue: { createUrlTree: (cmds: string[]) => ({ cmds }) } },
      ],
    });

    const result = await TestBed.runInInjectionContext(async () => {
      const guardResult = loginAccesoGuard({} as never, {} as never);
      return guardResult instanceof Object && 'subscribe' in guardResult
        ? new Promise((resolve) => (guardResult as ReturnType<typeof of>).subscribe(resolve))
        : guardResult;
    });

    expect(result).toEqual({ cmds: ['/registro'] });
  });
});
