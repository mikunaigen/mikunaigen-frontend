import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  readonly active = signal(false);

  constructor(private auth: AuthService) {}

  start(): void {
    this.active.set(true);
  }

  end(): void {
    this.active.set(false);
  }

  title(): string {
    return 'En mantenimiento';
  }

  message(): string {
    const s = this.auth.getSession();
    const role = typeof s?.role === 'string' ? s.role : '';
    const personal = role === 'CAJERO' || role === 'COCINERO' || role === 'REPARTIDOR' || role === 'ADMIN';
    return personal
      ? 'Aplicación pausada temporalmente por el Administrador para restauración de datos. Espere...'
      : 'Estamos realizando tareas de mantenimiento. Regresaremos en unos minutos...';
  }
}

