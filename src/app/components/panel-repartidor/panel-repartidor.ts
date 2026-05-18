import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment'; 

const API_REPARTIDOR = environment.apiUrl + '/pedidos/repartidor';
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_OK = ['image/jpeg', 'image/jpg', 'image/png'];

type TabKey = 'ordenes' | 'asumidos' | 'en-camino' | 'entregados';

interface RepartidorOrdenCard {
  id: string;
  status: 'PREPARADO' | 'EN_CAMINO' | 'ENTREGADO';
  createdAt: string;
  listoAt: string;
  deliveredAt: string;
  clienteNombre: string;
  direccionEntrega: string;
  deliveryPersonId: string;
}

interface RepartidorLineaDetalle {
  nombreProducto: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
}

interface RepartidorOrdenDetalle {
  id: string;
  status: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionEntrega: string;
  total: string;
  lineas: RepartidorLineaDetalle[];
}

@Component({
  selector: 'app-panel-repartidor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LogoutButtonComponent,
    ThemeToggleComponent,
    CompradorNavComponent,
  ],
  templateUrl: './panel-repartidor.component.html',
  styleUrl: './panel-repartidor.css',
})
export class PanelRepartidorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tab = signal<TabKey>('ordenes');
  readonly ahora = signal(Date.now());
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ordenes = signal<RepartidorOrdenCard[]>([]);
  readonly procesandoId = signal<string | null>(null);

  readonly detalleAbierto = signal(false);
  readonly detalle = signal<RepartidorOrdenDetalle | null>(null);
  readonly cargandoDetalle = signal(false);

  readonly pendingUndo = signal<Record<string, number>>({});
  private undoTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  readonly archivoEntrega = signal<File | null>(null);
  readonly errorArchivo = signal('');
  readonly modalEntregaId = signal<string | null>(null);
  readonly entregando = signal(false);

  readonly modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  ngOnInit(): void {
    this.cargarTablero();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      this.ahora.set(Date.now());
      this.actualizarCountdowns();
    });
    this.ws
      .subscribeToTopic('/topic/repartidor')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarTablero());
  }

  get ordenesDisponibles(): RepartidorOrdenCard[] {
    return this.ordenes().filter((o) => o.status === 'PREPARADO' && !o.deliveryPersonId);
  }
  get asumidos(): RepartidorOrdenCard[] {
    const uid = this.auth.getSession()?.userId || '';
    return this.ordenes().filter((o) => o.status === 'PREPARADO' && o.deliveryPersonId === uid);
  }
  get enCamino(): RepartidorOrdenCard[] {
    const uid = this.auth.getSession()?.userId || '';
    return this.ordenes().filter((o) => o.status === 'EN_CAMINO' && o.deliveryPersonId === uid);
  }
  get entregados(): RepartidorOrdenCard[] {
    const uid = this.auth.getSession()?.userId || '';
    const hoy = new Date();
    return this.ordenes().filter((o) => {
      if (!(o.status === 'ENTREGADO' && o.deliveryPersonId === uid)) return false;
      const d = new Date(o.deliveredAt || o.listoAt || o.createdAt);
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
    });
  }

  selectTab(tab: TabKey): void {
    this.tab.set(tab);
  }

  badge(tab: TabKey): number {
    if (tab === 'ordenes') return this.ordenesDisponibles.length;
    if (tab === 'asumidos') return this.asumidos.length;
    if (tab === 'en-camino') return this.enCamino.length;
    return this.entregados.length;
  }

  urgente(o: RepartidorOrdenCard): boolean {
    const base = new Date(o.listoAt || o.createdAt).getTime();
    if (!Number.isFinite(base)) return false;
    const min = (Date.now() - base) / 60000;
    return min >= 20;
  }

  tiempoDesdeListo(o: RepartidorOrdenCard): string {
    const base = new Date(o.listoAt || o.createdAt).getTime();
    if (!Number.isFinite(base)) return '00:00';
    const s = Math.max(0, Math.floor((this.ahora() - base) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  abrirDetalle(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.detalleAbierto.set(true);
    this.cargandoDetalle.set(true);
    this.http.get<RepartidorOrdenDetalle>(`${API_REPARTIDOR}/${orderId}`, { params: { userId: uid } }).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.modal.set({ tipo: 'error', titulo: 'Detalle', mensaje: err.error?.message || 'No se pudo cargar el detalle.' });
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.detalle.set(null);
  }

  asumir(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.procesandoId.set(orderId);
    this.http.post(`${API_REPARTIDOR}/${orderId}/asumir`, { userId: uid }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.marcarAsumidaLocal(orderId, uid);
        this.startUndo(orderId);
        this.tab.set('asumidos');
        this.cargarTablero();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.modal.set({ tipo: 'error', titulo: 'Asumir orden', mensaje: err.error?.message || 'No se pudo asumir la orden.' });
      },
    });
  }

  deshacer(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.clearUndo(orderId);
    this.procesandoId.set(orderId);
    this.http.post(`${API_REPARTIDOR}/${orderId}/deshacer-asumido`, { userId: uid }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.cargarTablero();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.modal.set({ tipo: 'error', titulo: 'Deshacer', mensaje: err.error?.message || 'No se pudo deshacer.' });
      },
    });
  }

  enCaminoAction(orderId: string): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.clearUndo(orderId);
    this.procesandoId.set(orderId);
    this.http.post(`${API_REPARTIDOR}/${orderId}/en-camino`, { userId: uid }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.cargarTablero();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.modal.set({ tipo: 'error', titulo: 'En camino', mensaje: err.error?.message || 'No se pudo actualizar.' });
      },
    });
  }

  abrirModalEntrega(orderId: string): void {
    this.modalEntregaId.set(orderId);
    this.archivoEntrega.set(null);
    this.errorArchivo.set('');
  }

  cerrarModalEntrega(): void {
    this.modalEntregaId.set(null);
    this.archivoEntrega.set(null);
    this.errorArchivo.set('');
  }

  onArchivoEntrega(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    const type = (f.type || '').toLowerCase();
    const okMime = MIME_OK.some((m) => type === m || (m === 'image/jpg' && type === 'image/jpeg'));
    if (!okMime) {
      this.errorArchivo.set('Solo se permiten imágenes en formato JPG o PNG.');
      this.archivoEntrega.set(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      this.errorArchivo.set('La imagen no debe pesar más de 5MB.');
      this.archivoEntrega.set(null);
      return;
    }
    this.errorArchivo.set('');
    this.archivoEntrega.set(f);
  }

  confirmarEntregado(): void {
    const orderId = this.modalEntregaId();
    const uid = this.auth.getSession()?.userId;
    const f = this.archivoEntrega();
    if (!orderId || !uid || !f) {
      this.errorArchivo.set('Adjunta una imagen antes de continuar.');
      return;
    }
    this.entregando.set(true);
    const fd = new FormData();
    fd.append('userId', uid);
    fd.append('pruebaEntrega', f, f.name);
    this.http.post(`${API_REPARTIDOR}/${orderId}/entregar`, fd).subscribe({
      next: () => {
        this.entregando.set(false);
        this.cerrarModalEntrega();
        this.cargarTablero();
        this.tab.set('entregados');
        this.modal.set({ tipo: 'ok', titulo: 'Entrega registrada', mensaje: '¡Excelente trabajo! Pedido entregado' });
      },
      error: (err) => {
        this.entregando.set(false);
        this.modal.set({ tipo: 'error', titulo: 'Entrega', mensaje: err.error?.message || 'No se pudo registrar la entrega.' });
      },
    });
  }

  countdown(orderId: string): number {
    return this.pendingUndo()[orderId] || 0;
  }

  formatoMoneda(v: string): string {
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
  }

  cerrarModalInfo(): void {
    this.modal.set(null);
  }

  private cargarTablero(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) return;
    this.http.get<RepartidorOrdenCard[]>(`${API_REPARTIDOR}/tablero`, { params: { userId: uid } }).subscribe({
      next: (rows) => {
        this.cargando.set(false);
        this.error.set('');
        this.ordenes.set(Array.isArray(rows) ? rows : []);
        this.cleanupUndo();
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el panel de repartidor.');
      },
    });
  }

  private startUndo(orderId: string): void {
    this.clearUndo(orderId);
    const until = Date.now() + 10000;
    this.pendingUndo.update((s) => ({ ...s, [orderId]: 10 }));
    const t = setTimeout(() => {
      this.clearUndo(orderId);
      this.cargarTablero();
    }, 10000);
    this.undoTimeouts.set(orderId, t);
    this.actualizarCountdownsWithUntil(orderId, until);
  }

  private actualizarCountdownsWithUntil(orderId: string, until: number): void {
    const i = setInterval(() => {
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      this.pendingUndo.update((s) => {
        if (!(orderId in s)) {
          clearInterval(i);
          return s;
        }
        if (rem <= 0) {
          const { [orderId]: _, ...rest } = s;
          clearInterval(i);
          return rest;
        }
        return { ...s, [orderId]: rem };
      });
    }, 300);
  }

  private clearUndo(orderId: string): void {
    const t = this.undoTimeouts.get(orderId);
    if (t) clearTimeout(t);
    this.undoTimeouts.delete(orderId);
    this.pendingUndo.update((s) => {
      const { [orderId]: _, ...rest } = s;
      return rest;
    });
  }

  private cleanupUndo(): void {
    const ids = new Set(this.ordenes().map((o) => o.id));
    Object.keys(this.pendingUndo()).forEach((id) => {
      if (!ids.has(id)) this.clearUndo(id);
    });
  }

  private marcarAsumidaLocal(orderId: string, userId: string): void {
    this.ordenes.update((rows) =>
      rows.map((o) =>
        o.id === orderId
          ? {
              ...o,
              deliveryPersonId: userId,
              status: 'PREPARADO',
            }
          : o,
      ),
    );
  }

  private actualizarCountdowns(): void {
    this.pendingUndo.update((s) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(s)) {
        if (v > 0) next[k] = v;
      }
      return next;
    });
  }
}
