import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment'; 

const API_SEG = environment.apiUrl + '/pedidos/seguimiento';
const API_CAL = environment.apiUrl + '/pedidos/calificacion';

type Estado = 'VALIDANDO_PAGO' | 'PAGO_VALIDADO' | 'EN_COCINA' | 'PREPARADO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

interface Linea {
  nombreProducto: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
}

interface SeguimientoResp {
  orderId: string;
  estado: Estado;
  createdAt: string;
  total: string;
  cancelReason: string;
  repartidorNombre: string;
  isRated: boolean;
  lineas: Linea[];
}

interface SeguimientoListasResp {
  pendientes: SeguimientoResp[];
  finalizados: SeguimientoResp[];
}

@Component({
  selector: 'app-seguimiento-pedido',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutButtonComponent, CompradorNavComponent],
  templateUrl: './seguimiento-pedido.component.html',
})
export class SeguimientoPedidoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly listas = signal<SeguimientoListasResp | null>(null);
  readonly pestana = signal<'pendientes' | 'finalizados'>('pendientes');
  readonly seleccionId = signal<string | null>(null);

  readonly data = computed(() => {
    const L = this.listas();
    const id = this.seleccionId();
    const tab = this.pestana();
    if (!L || !id) return null;
    const arr = tab === 'pendientes' ? L.pendientes : L.finalizados;
    return arr.find((o) => o.orderId === id) ?? null;
  });

  readonly cargando = signal(true);
  readonly error = signal('');
  readonly animar = signal(false);

  modalCalif = false;
  estrellasSel = 0;
  comentarioCalif = '';
  enviandoCalif = false;
  errorCalif = '';

  readonly pasos = [
    { key: 'VALIDANDO_PAGO', label1: 'Validando', label2: 'Pago', icon: '/iconos/documento.png' },
    { key: 'PAGO_VALIDADO', label1: 'Pago', label2: 'Validado', icon: '/iconos/billetes-soles.png' },
    { key: 'EN_COCINA', label1: 'En', label2: 'Cocina', icon: '/iconos/plato.png' },
    { key: 'PREPARADO', label1: 'Preparado', label2: '', icon: '/iconos/destellos-recomendaciones.png' },
    { key: 'EN_CAMINO', label1: 'En', label2: 'Camino', icon: '/iconos/camion-abastecer-ingrediente.png' },
    { key: 'ENTREGADO', label1: 'Entregado', label2: '', icon: '/iconos/like-pulgar.png' },
  ] as const;

  ngOnInit(): void {
    this.cargar();
    const uid = this.auth.getSession()?.userId;
    if (uid) {
      this.ws
        .subscribeToTopic('/topic/pedidos/' + uid)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.cargar());
    }
  }

  formatoMoneda(v: string): string {
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
  }

  formatoFechaPedido(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  }

  pedidosPestana(): SeguimientoResp[] {
    const L = this.listas();
    if (!L) return [];
    return this.pestana() === 'pendientes' ? L.pendientes : L.finalizados;
  }

  setPestana(p: 'pendientes' | 'finalizados'): void {
    this.pestana.set(p);
    const L = this.listas();
    if (!L) return;
    const arr = p === 'pendientes' ? L.pendientes : L.finalizados;
    const cur = this.seleccionId();
    if (cur && arr.some((o) => o.orderId === cur)) return;
    this.seleccionId.set(arr[0]?.orderId ?? null);
  }

  seleccionar(o: SeguimientoResp): void {
    this.seleccionId.set(o.orderId);
  }

  idxEstado(): number {
    const s = this.data()?.estado;
    if (!s || s === 'CANCELADO') return -1;
    return this.pasos.findIndex((p) => p.key === s);
  }

  estadoMsg(): string {
    const s = this.data()?.estado;
    if (s === 'VALIDANDO_PAGO') return 'Estamos revisando tu comprobante de pago.';
    if (s === 'PAGO_VALIDADO') return 'Pago confirmado. Tu pedido ingresó a cocina.';
    if (s === 'EN_COCINA') return 'Tu comida se está cocinando con amor.';
    if (s === 'PREPARADO') return 'Tu pedido está listo y buscando repartidor.';
    if (s === 'EN_CAMINO') return 'El repartidor está a unas cuadras de tu casa.';
    if (s === 'ENTREGADO') return '¡Pedido entregado con éxito!';
    return 'Tu pedido fue cancelado por validación de pago.';
  }

  private normalizarListas(r: SeguimientoListasResp): SeguimientoListasResp {
    return {
      pendientes: (r.pendientes ?? []).map((o) => ({ ...o, isRated: o.isRated ?? false })),
      finalizados: (r.finalizados ?? []).map((o) => ({ ...o, isRated: o.isRated ?? false })),
    };
  }

  private aplicarListas(norm: SeguimientoListasResp, prevId: string | null, prevEstado: Estado | undefined): void {
    if (norm.pendientes.length === 0 && norm.finalizados.length === 0) {
      this.listas.set(norm);
      this.seleccionId.set(null);
      this.error.set('No tienes pedidos registrados.');
      return;
    }
    this.error.set('');
    this.listas.set(norm);
    const inPend = prevId ? norm.pendientes.find((o) => o.orderId === prevId) : undefined;
    const inFin = prevId ? norm.finalizados.find((o) => o.orderId === prevId) : undefined;
    if (inPend) {
      this.pestana.set('pendientes');
      this.seleccionId.set(prevId);
    } else if (inFin) {
      this.pestana.set('finalizados');
      this.seleccionId.set(prevId);
    } else if (norm.pendientes.length > 0) {
      this.pestana.set('pendientes');
      this.seleccionId.set(norm.pendientes[0].orderId);
    } else {
      this.pestana.set('finalizados');
      this.seleccionId.set(norm.finalizados[0].orderId);
    }
    const nuevo = this.data()?.estado;
    if (prevEstado && nuevo && prevEstado !== nuevo) {
      this.animar.set(true);
      setTimeout(() => this.animar.set(false), 1000);
    }
  }

  private cargar(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      this.cargando.set(false);
      this.error.set('Debes iniciar sesión para ver el seguimiento.');
      return;
    }
    const prevEstado = this.data()?.estado;
    const prevId = this.seleccionId();
    this.http.get<SeguimientoListasResp>(`${API_SEG}/listas`, { params: { userId: uid } }).subscribe({
      next: (r) => {
        const norm = this.normalizarListas(r);
        this.cargando.set(false);
        this.aplicarListas(norm, prevId, prevEstado);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el seguimiento.');
      },
    });
  }

  abrirCalificacion(): void {
    this.estrellasSel = 0;
    this.comentarioCalif = '';
    this.errorCalif = '';
    this.modalCalif = true;
  }

  cerrarCalificacion(): void {
    if (this.enviandoCalif) return;
    this.modalCalif = false;
  }

  setEstrella(n: number): void {
    this.estrellasSel = n;
    this.errorCalif = '';
  }

  enviarCalificacion(): void {
    const uid = this.auth.getSession()?.userId;
    const d = this.data();
    if (!uid || !d) return;
    if (this.estrellasSel < 1 || this.estrellasSel > 5) {
      this.errorCalif = 'Selecciona entre 1 y 5 estrellas.';
      return;
    }
    this.enviandoCalif = true;
    this.errorCalif = '';
    const c = this.comentarioCalif.trim();
    const oid = d.orderId;
    this.http
      .post<{ ok?: boolean }>(API_CAL, {
        userId: uid,
        orderId: oid,
        stars: this.estrellasSel,
        comment: c.length > 0 ? c : null,
      })
      .subscribe({
        next: () => {
          this.enviandoCalif = false;
          this.modalCalif = false;
          this.listas.update((L) => {
            if (!L) return L;
            return {
              pendientes: L.pendientes.map((o) => (o.orderId === oid ? { ...o, isRated: true } : o)),
              finalizados: L.finalizados.map((o) => (o.orderId === oid ? { ...o, isRated: true } : o)),
            };
          });
        },
        error: (err) => {
          this.enviandoCalif = false;
          this.errorCalif = err.error?.message || 'No se pudo enviar la calificación.';
        },
      });
  }
}
