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
    return this.auth.esAdministrador()
      ? 'Aplicación pausada temporalmente por el Administrador para restauración de datos. Espere...'
      : 'Estamos realizando tareas de mantenimiento. Regresaremos en unos minutos...';
  }
}

