import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment'; 

const API_COCINA = environment.apiUrl + '/pedidos/cocina';

type CocinaEstado = 'PAGO_VALIDADO' | 'EN_COCINA' | 'PREPARADO';

interface CocinaIngredienteDetalle {
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface CocinaLineaDetalle {
  productoMongoId: string;
  productoNombre: string;
  cantidad: number;
  ingredientes: CocinaIngredienteDetalle[];
}

interface CocinaOrdenCard {
  id: string;
  estado: CocinaEstado;
  createdAt: string;
  clienteNombre: string;
  lineas: CocinaLineaDetalle[];
}

@Component({
  selector: 'app-panel-cocina',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutButtonComponent, CompradorNavComponent],
  templateUrl: './panel-cocina.component.html',
  styleUrl: './panel-cocina.css',
})
export class PanelCocinaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ordenes = signal<CocinaOrdenCard[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ahora = signal(Date.now());
  readonly dragOrderId = signal<string | null>(null);
  readonly bloqueando = signal<string | null>(null);
  readonly modal = signal<{ titulo: string; mensaje: string } | null>(null);

  private readonly pendientesInicio = new Map<string, number>();
  private readonly pendientesTimeout = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    this.cargarTableroSilencioso();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      this.ahora.set(Date.now());
    });
    this.ws
      .subscribeToTopic('/topic/cocina')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarTableroSilencioso());
  }

  get enCola(): CocinaOrdenCard[] {
    return this.ordenes().filter((o) => o.estado === 'PAGO_VALIDADO' && !this.pendientesInicio.has(o.id));
  }

  get enPreparacion(): CocinaOrdenCard[] {
    return this.ordenes().filter((o) => o.estado === 'EN_COCINA');
  }

  get listos(): CocinaOrdenCard[] {
    return this.ordenes().filter((o) => o.estado === 'PREPARADO');
  }

  get iniciandoLocal(): CocinaOrdenCard[] {
    return this.ordenes().filter((o) => this.pendientesInicio.has(o.id));
  }

  onDragStart(orderId: string): void {
    this.dragOrderId.set(orderId);
  }

  onDragEnd(): void {
    this.dragOrderId.set(null);
  }

  onAllowDrop(ev: DragEvent): void {
    ev.preventDefault();
  }

  onDropEnPreparacion(ev: DragEvent): void {
    ev.preventDefault();
    const id = this.dragOrderId();
    if (!id) return;
    const o = this.ordenes().find((x) => x.id === id);
    if (!o || o.estado !== 'PAGO_VALIDADO') return;
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.bloqueando.set(id);
    this.http.post(`${API_COCINA}/${id}/validar-stock`, { userId: uid }).subscribe({
      next: () => {
        this.bloqueando.set(null);
        this.pendientesInicio.set(id, Date.now());
        const t = setTimeout(() => this.confirmarPasoAPreparacion(id), 10000);
        this.pendientesTimeout.set(id, t);
      },
      error: (err) => {
        this.bloqueando.set(null);
        this.modal.set({
          titulo: 'Stock insuficiente',
          mensaje: err.error?.message || 'No se puede iniciar preparación por falta de insumos.',
        });
      },
    });
  }

  onDropListo(ev: DragEvent): void {
    ev.preventDefault();
    const id = this.dragOrderId();
    if (!id) return;
    const o = this.ordenes().find((x) => x.id === id);
    if (!o || o.estado !== 'EN_COCINA') return;
    this.marcarListo(id);
  }

  revertirPendiente(orderId: string): void {
    const t = this.pendientesTimeout.get(orderId);
    if (t) clearTimeout(t);
    this.pendientesTimeout.delete(orderId);
    this.pendientesInicio.delete(orderId);
  }

  tiempoPendiente(orderId: string): number {
    const st = this.pendientesInicio.get(orderId);
    if (!st) return 0;
    return Math.max(0, 10 - Math.floor((Date.now() - st) / 1000));
  }

  tiempoTranscurrido(createdAt: string): string {
    const t = new Date(createdAt).getTime();
    if (!Number.isFinite(t)) return '00:00';
    const sec = Math.max(0, Math.floor((this.ahora() - t) / 1000));
    const mm = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  trackByOrder(_: number, o: CocinaOrdenCard): string {
    return o.id;
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  private confirmarPasoAPreparacion(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.bloqueando.set(orderId);
    this.http.post(`${API_COCINA}/${orderId}/iniciar`, { userId: uid }).subscribe({
      next: () => {
        this.bloqueando.set(null);
        this.pendientesTimeout.delete(orderId);
        this.pendientesInicio.delete(orderId);
        this.cargarTableroSilencioso();
      },
      error: (err) => {
        this.bloqueando.set(null);
        this.pendientesTimeout.delete(orderId);
        this.pendientesInicio.delete(orderId);
        this.modal.set({
          titulo: 'No se pudo mover la orden',
          mensaje: err.error?.message || 'La orden no pudo pasar a preparación.',
        });
        this.cargarTableroSilencioso();
      },
    });
  }

  private marcarListo(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.bloqueando.set(orderId);
    this.http.post(`${API_COCINA}/${orderId}/listo`, { userId: uid }).subscribe({
      next: () => {
        this.bloqueando.set(null);
        this.cargarTableroSilencioso();
      },
      error: (err) => {
        this.bloqueando.set(null);
        this.modal.set({
          titulo: 'No se pudo marcar como listo',
          mensaje: err.error?.message || 'No se pudo actualizar la orden.',
        });
      },
    });
  }

  private cargarTableroSilencioso(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.http.get<CocinaOrdenCard[]>(`${API_COCINA}/tablero`, { params: { userId: uid } }).subscribe({
      next: (rows) => {
        this.cargando.set(false);
        this.error.set('');
        const list = Array.isArray(rows) ? rows : [];
        const ids = new Set(list.map((x) => x.id));
        for (const id of this.pendientesInicio.keys()) {
          if (!ids.has(id)) {
            this.pendientesInicio.delete(id);
            const t = this.pendientesTimeout.get(id);
            if (t) clearTimeout(t);
            this.pendientesTimeout.delete(id);
          }
        }
        this.ordenes.set(list);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el tablero de cocina.');
      },
    });
  }
}
