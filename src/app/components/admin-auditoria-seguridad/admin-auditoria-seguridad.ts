import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import {
  AuditoriaSeguridadDto,
  AuditoriaSeguridadService,
} from '../../services/auditoria-seguridad.service';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-admin-auditoria-seguridad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-auditoria-seguridad.component.html',
})
export class AdminAuditoriaSeguridadComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaSeguridadService);

  cargando = signal(true);
  error = signal<string | null>(null);
  datos = signal<AuditoriaSeguridadDto | null>(null);

  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroUsuario = '';
  filtroComponente = '';

  registroExpandido = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.auditoriaService
      .consultar({
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        usuario: this.filtroUsuario || undefined,
        componente: this.filtroComponente || undefined,
      })
      .subscribe({
        next: (res) => {
          this.datos.set(res);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(err?.error?.message || 'No se pudieron cargar los datos de auditoría.');
        },
      });
  }

  limpiarFiltros(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroUsuario = '';
    this.filtroComponente = '';
    this.cargar();
  }

  alternarDetalle(id: string): void {
    this.registroExpandido.update((actual) => (actual === id ? null : id));
  }

  resumenParametros(parametros: Record<string, unknown> | null | undefined): string {
    if (!parametros) {
      return '—';
    }
    const objetivo = parametros['objetivo'];
    if (objetivo && typeof objetivo === 'object') {
      const claves = Object.keys(objetivo as object).slice(0, 4);
      return claves.length ? `Objetivo: ${claves.join(', ')}…` : 'Objetivo nutricional';
    }
    return 'Parámetros de formulación';
  }
}
