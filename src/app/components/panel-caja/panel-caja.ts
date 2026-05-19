import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment'; 

const API_CAJA = environment.apiUrl + '/pedidos/caja';

export interface CajaOrdenListaItem {
  id: string;
  createdAt: string;
  clienteNombre: string;
  total: string;
}

export interface CajaLineaDetalle {
  nombreProducto: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
}

export interface CajaOrdenDetalle {
  id: string;
  createdAt: string;
  estado: string;
  total: string;
  clienteNombres: string;
  clienteApellidos: string;
  clienteEmail: string;
  clienteTelefono: string;
  direccionEntrega: string;
  lineas: CajaLineaDetalle[];
  comprobanteDataUrl: string;
}

@Component({
  selector: 'app-panel-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, CompradorNavComponent, NgIconComponent],
  templateUrl: './panel-caja.component.html',
  styleUrl: './panel-caja.css',
})
export class PanelCajaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ordenes = signal<CajaOrdenListaItem[]>([]);
  readonly cargandoLista = signal(true);
  readonly errorLista = signal(false);

  detalleAbierto = signal(false);
  detalle = signal<CajaOrdenDetalle | null>(null);
  cargandoDetalle = signal(false);
  ordenSeleccionadaId = signal<string | null>(null);

  procesando = signal(false);

  modalConfirmarValidar = signal(false);
  modalRechazar = signal(false);
  motivoRechazo = '';

  zoomComprobante = signal(false);

  modalError = signal<{ titulo: string; mensaje: string } | null>(null);

  ngOnInit(): void {
    this.refrescarLista();
    this.ws
      .subscribeToTopic('/topic/caja')
      .pipe(takeUntilDestroyed(this.destroyRef), filter(() => !!this.auth.getSession()?.userId))
      .subscribe(() => this.refrescarLista());
  }

  private refrescarLista(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      return;
    }
    this.cargandoLista.set(true);
    this.http.get<CajaOrdenListaItem[]>(`${API_CAJA}/pendientes`, { params: { processorUserId: uid } }).subscribe({
      next: (data) => {
        this.ordenes.set(Array.isArray(data) ? data : []);
        this.cargandoLista.set(false);
        this.errorLista.set(false);
      },
      error: () => {
        this.cargandoLista.set(false);
        this.errorLista.set(true);
      },
    });
  }

  abrirDetalle(ordenId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      return;
    }
    this.ordenSeleccionadaId.set(ordenId);
    this.detalleAbierto.set(true);
    this.cargandoDetalle.set(true);
    this.detalle.set(null);
    this.http.get<CajaOrdenDetalle>(`${API_CAJA}/${ordenId}`, { params: { processorUserId: uid } }).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.mostrarError('Pedido', err.error?.message || 'No se pudo cargar el pedido.');
        this.cerrarDetalle();
      },
    });
  }

  private recargarDetalleSilencioso(ordenId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      return;
    }
    this.http.get<CajaOrdenDetalle>(`${API_CAJA}/${ordenId}`, { params: { processorUserId: uid } }).subscribe({
      next: (d) => {
        this.detalle.set(d);
        const sigue = this.ordenes().some((o) => o.id === ordenId);
        if (!sigue) {
          this.cerrarDetalle();
        }
      },
      error: () => {
        this.cerrarDetalle();
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.detalle.set(null);
    this.ordenSeleccionadaId.set(null);
    this.modalConfirmarValidar.set(false);
    this.modalRechazar.set(false);
    this.motivoRechazo = '';
    this.zoomComprobante.set(false);
  }

  formatoMoneda(valor: string | number): string {
    const n = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    if (Number.isNaN(n)) {
      return valor.toString();
    }
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
  }

  formatoFecha(iso: string): string {
    if (!iso) {
      return '—';
    }
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return iso;
    }
  }

  abrirZoomComprobante(): void {
    this.zoomComprobante.set(true);
  }

  cerrarZoomComprobante(): void {
    this.zoomComprobante.set(false);
  }

  solicitarValidar(): void {
    this.modalConfirmarValidar.set(true);
  }

  cerrarModalConfirmarValidar(): void {
    this.modalConfirmarValidar.set(false);
  }

  confirmarValidar(): void {
    const id = this.ordenSeleccionadaId();
    const uid = this.auth.getSession()?.userId;
    if (!id || !uid) {
      return;
    }
    this.procesando.set(true);
    this.modalConfirmarValidar.set(false);
    this.http.post(`${API_CAJA}/${id}/validar`, { processorUserId: uid }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.cerrarDetalle();
        this.refrescarLista();
      },
      error: (err) => {
        this.procesando.set(false);
        this.mostrarError('Validación', err.error?.message || 'No se pudo validar el pago.');
      },
    });
  }

  abrirModalRechazar(): void {
    this.motivoRechazo = '';
    this.modalRechazar.set(true);
  }

  cerrarModalRechazar(): void {
    this.modalRechazar.set(false);
    this.motivoRechazo = '';
  }

  enviarRechazo(): void {
    const id = this.ordenSeleccionadaId();
    const uid = this.auth.getSession()?.userId;
    const m = (this.motivoRechazo || '').trim();
    if (!id || !uid) {
      return;
    }
    if (!m) {
      this.mostrarError('Motivo requerido', 'Describe el motivo del rechazo.');
      return;
    }
    this.procesando.set(true);
    this.http.post(`${API_CAJA}/${id}/rechazar`, { processorUserId: uid, motivo: m }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.modalRechazar.set(false);
        this.motivoRechazo = '';
        this.cerrarDetalle();
        this.refrescarLista();
      },
      error: (err) => {
        this.procesando.set(false);
        this.mostrarError('Rechazo', err.error?.message || 'No se pudo rechazar el pago.');
      },
    });
  }

  private mostrarError(titulo: string, mensaje: string): void {
    this.modalError.set({ titulo, mensaje });
  }

  cerrarModalError(): void {
    this.modalError.set(null);
  }
}
