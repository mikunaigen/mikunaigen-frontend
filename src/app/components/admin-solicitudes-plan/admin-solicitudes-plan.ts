import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import {
  PlanUsuarioService,
  SolicitudAdminItem,
  topicPlanesAdmin,
} from '../../services/plan-usuario.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { ImagenPreviewComponent } from '../shared/imagen-preview/imagen-preview';

@Component({
  selector: 'app-admin-solicitudes-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent, ImagenPreviewComponent],
  templateUrl: './admin-solicitudes-plan.component.html',
})
export class AdminSolicitudesPlanComponent implements OnInit, OnDestroy {
  private readonly planService = inject(PlanUsuarioService);
  private readonly websocket = inject(WebsocketService);

  private wsSub?: Subscription;

  cargando = signal(true);
  solicitudes = signal<SolicitudAdminItem[]>([]);
  filtro = 'pendiente';
  motivoRechazo = '';
  seleccionada = signal<SolicitudAdminItem | null>(null);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  comprobanteUrls = signal<Record<number, string>>({});
  comprobanteCargando = signal<Record<number, boolean>>({});

  private readonly urlsRevocar = new Set<string>();

  ngOnInit(): void {
    this.cargar();
    this.wsSub = this.websocket.subscribeToTopic(topicPlanesAdmin()).subscribe(() => {
      this.cargar(true);
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    for (const url of this.urlsRevocar) {
      URL.revokeObjectURL(url);
    }
    this.urlsRevocar.clear();
  }

  cargar(silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    const urlsPrevias = { ...this.comprobanteUrls() };
    this.planService.listarSolicitudesAdmin(this.filtro || undefined).subscribe({
      next: (res) => {
        this.cargando.set(false);
        const lista = res.solicitudes ?? [];
        this.solicitudes.set(lista);
        const idsActuales = new Set(lista.map((s) => s.id));
        for (const [idStr, url] of Object.entries(urlsPrevias)) {
          const id = Number(idStr);
          if (!idsActuales.has(id)) {
            URL.revokeObjectURL(url);
            this.urlsRevocar.delete(url);
            delete urlsPrevias[id];
          }
        }
        this.comprobanteUrls.set(urlsPrevias);
        for (const s of lista) {
          if (s.tieneComprobante && !this.comprobanteUrls()[s.id]) {
            this.cargarComprobante(s.id);
          }
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudieron cargar las solicitudes.',
        });
      },
    });
  }

  urlComprobante(id: number): string | null {
    return this.comprobanteUrls()[id] ?? null;
  }

  estaCargandoComprobante(id: number): boolean {
    return !!this.comprobanteCargando()[id];
  }

  aprobar(s: SolicitudAdminItem): void {
    this.planService.aprobar(s.id).subscribe({
      next: (res) => {
        this.modal.set({ tipo: 'ok', titulo: 'Aprobada', mensaje: res.message });
        this.cargar();
      },
      error: (err) => {
        this.modal.set({ tipo: 'error', titulo: 'Error', mensaje: err?.error?.message || 'No se pudo aprobar.' });
      },
    });
  }

  abrirRechazo(s: SolicitudAdminItem): void {
    this.seleccionada.set(s);
    this.motivoRechazo = '';
  }

  confirmarRechazo(): void {
    const s = this.seleccionada();
    if (!s) return;
    const motivo = this.motivoRechazo.trim();
    if (!motivo) {
      this.modal.set({ tipo: 'error', titulo: 'Validación', mensaje: 'Indica el motivo del rechazo.' });
      return;
    }
    this.planService.rechazar(s.id, motivo).subscribe({
      next: (res) => {
        this.seleccionada.set(null);
        this.modal.set({ tipo: 'ok', titulo: 'Rechazada', mensaje: res.message });
        this.cargar();
      },
      error: (err) => {
        this.modal.set({ tipo: 'error', titulo: 'Error', mensaje: err?.error?.message || 'No se pudo rechazar.' });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  etiquetaEstado(estado?: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
    };
    return map[(estado || '').toLowerCase()] || estado || '—';
  }

  cargarComprobante(id: number): void {
    if (this.comprobanteUrls()[id] || this.comprobanteCargando()[id]) {
      return;
    }
    this.comprobanteCargando.update((m) => ({ ...m, [id]: true }));
    this.planService.obtenerComprobante(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.urlsRevocar.add(url);
        this.comprobanteUrls.update((m) => ({ ...m, [id]: url }));
        this.comprobanteCargando.update((m) => ({ ...m, [id]: false }));
      },
      error: () => {
        this.comprobanteCargando.update((m) => ({ ...m, [id]: false }));
      },
    });
  }
}
