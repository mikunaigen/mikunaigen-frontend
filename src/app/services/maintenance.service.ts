import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  readonly active = signal(false);

  constructor(private readonly auth: AuthService) {}

  start(): void {
    this.active.set(true);
  }

  end(): void {
    this.active.set(false);
  }

  title(): string {
    return this.esAdministradorRestaurando() ? 'Restaurando base de datos' : 'En mantenimiento';
  }

  message(): string {
    if (this.esAdministradorRestaurando()) {
      return 'La restauración de PostgreSQL está en curso. No cierre esta ventana hasta que finalice.';
    }
    return 'Estamos realizando tareas de mantenimiento. Regresaremos en unos minutos.';
  }

  esAdministradorRestaurando(): boolean {
    return this.active() && this.auth.esAdministrador();
  }
}
