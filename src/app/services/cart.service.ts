import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

export const MAX_UNIDADES_POR_PRODUCTO = 10;

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  thumbSrc: string;
}

export interface CarritoResponseDto {
  items: CartLine[];
  removedItems?: string[];
}

export interface ProductoCarritoInput {
  id: string;
  name?: string;
  price?: number;
  imagesBase64?: string[] | null;
}

export interface VerificarPreciosResponseDto {
  preciosCambiaron: boolean;
  totalAnterior: number;
  totalNuevo: number;
  detalleCambios: { nombre: string; precioAnterior: number; precioNuevo: number }[];
  carritoActualizado: CarritoResponseDto;
}

const API_CARRITO = environment.apiUrl + '/carrito';

const SNAPSHOT_PRECIOS_KEY = 'rb_cart_precios_snapshot';

export type PersistedCartSnapshot = {
  userId: string;
  lines: CartLine[];
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly lines = signal<CartLine[]>([]);
  readonly sincronizando = signal(false);

  readonly items = this.lines.asReadonly();

  readonly totalUnidades = computed(() => this.lines().reduce((s, l) => s + l.quantity, 0));

  readonly totalOrden = computed(() =>
    this.lines().reduce((s, l) => s + l.unitPrice * l.quantity, 0),
  );

  subtotalLinea(line: CartLine): number {
    return line.unitPrice * line.quantity;
  }

  applyCarritoResponse(resp: CarritoResponseDto | null | undefined): void {
    const items = resp?.items;
    if (!items || !Array.isArray(items)) {
      this.lines.set([]);
      this.persistPriceSnapshot();
      return;
    }
    const mapped = items.map((x: CartLine) => ({
      productId: x.productId,
      quantity: Math.min(MAX_UNIDADES_POR_PRODUCTO, Math.max(0, Number(x.quantity) || 0)),
      name: String(x.name ?? ''),
      unitPrice: Number(x.unitPrice) || 0,
      thumbSrc: String(x.thumbSrc ?? ''),
    }));
    this.lines.set(mapped);
    this.persistPriceSnapshot();
  }

  applyFromLoginPayload(
    user: { role?: string; cart?: CarritoResponseDto; userId?: string } | null | undefined,
  ): void {
    if (!user?.userId && !this.auth.getSession()?.userId) {
      this.lines.set([]);
      this.clearPriceSnapshot();
      return;
    }
    this.applyCarritoResponse(user?.cart ?? { items: [] });
  }

  limpiarLocal(): void {
    this.lines.set([]);
  }

  readPersistedSnapshot(): PersistedCartSnapshot | null {
    try {
      const raw = localStorage.getItem(SNAPSHOT_PRECIOS_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw) as PersistedCartSnapshot;
      if (!o?.userId || !Array.isArray(o.lines)) return null;
      return o;
    } catch {
      return null;
    }
  }

  clearPriceSnapshot(): void {
    try {
      localStorage.removeItem(SNAPSHOT_PRECIOS_KEY);
    } catch {}
  }

  private persistPriceSnapshot(): void {
    try {
      const s = this.auth.getSession();
      if (!s?.userId) {
        return;
      }
      const lines = this.lines();
      if (lines.length === 0) {
        localStorage.removeItem(SNAPSHOT_PRECIOS_KEY);
        return;
      }
      const payload: PersistedCartSnapshot = {
        userId: s.userId,
        lines: lines.map((l) => ({ ...l })),
      };
      localStorage.setItem(SNAPSHOT_PRECIOS_KEY, JSON.stringify(payload));
    } catch {}
  }

  puedeSincronizar(): boolean {
    const s = this.auth.getSession();
    return this.auth.isLoggedIn() && !!s?.userId;
  }

  private requireClienteUserId(): string {
    const s = this.auth.getSession();
    if (!this.auth.isLoggedIn() || !s?.userId) {
      throw new Error('Sesión no disponible.');
    }
    return s.userId;
  }

  cargarDesdeServidor(userId: string): Observable<{ removedItems: string[] }> {
    if (!userId) {
      this.limpiarLocal();
      return of({ removedItems: [] });
    }
    this.sincronizando.set(true);
    return this.http.get<CarritoResponseDto>(`${API_CARRITO}`, { params: { userId } }).pipe(
      tap((r) => this.applyCarritoResponse(r)),
      map((r) => ({ removedItems: r.removedItems ?? [] })),
      catchError(() => {
        this.limpiarLocal();
        return of({ removedItems: [] });
      }),
      finalize(() => this.sincronizando.set(false)),
    );
  }

  private postMutation(obs: Observable<CarritoResponseDto>): Observable<void> {
    this.sincronizando.set(true);
    return obs.pipe(
      tap((r) => this.applyCarritoResponse(r)),
      map(() => void 0),
      catchError((err) => throwError(() => err)),
      finalize(() => this.sincronizando.set(false)),
    );
  }

  agregarUno(p: ProductoCarritoInput): Observable<void> {
    if (!this.puedeSincronizar()) {
      return throwError(() => new Error('Inicia sesión para usar el carrito.'));
    }
    const uid = this.requireClienteUserId();
    return this.postMutation(
      this.http.post<CarritoResponseDto>(`${API_CARRITO}/agregar`, {
        userId: uid,
        productId: p.id,
      }),
    );
  }

  incrementar(productId: string): Observable<void> {
    if (!this.puedeSincronizar()) {
      return throwError(() => new Error('Inicia sesión para usar el carrito.'));
    }
    const uid = this.requireClienteUserId();
    return this.postMutation(
      this.http.post<CarritoResponseDto>(`${API_CARRITO}/incrementar`, {
        userId: uid,
        productId,
      }),
    );
  }

  decrementar(productId: string): Observable<void> {
    if (!this.puedeSincronizar()) {
      return throwError(() => new Error('Inicia sesión para usar el carrito.'));
    }
    const uid = this.requireClienteUserId();
    return this.postMutation(
      this.http.post<CarritoResponseDto>(`${API_CARRITO}/decrementar`, {
        userId: uid,
        productId,
      }),
    );
  }

  quitar(productId: string): Observable<void> {
    if (!this.puedeSincronizar()) {
      return throwError(() => new Error('Inicia sesión para usar el carrito.'));
    }
    const uid = this.requireClienteUserId();
    return this.postMutation(
      this.http.post<CarritoResponseDto>(`${API_CARRITO}/eliminar`, {
        userId: uid,
        productId,
      }),
    );
  }

  obtenerSugerenciasCrossSell(): Observable<CartLine[]> {
    if (!this.puedeSincronizar()) {
      return of([]);
    }
    const uid = this.requireClienteUserId();
    return this.http
      .get<CartLine[]>(`${API_CARRITO}/sugerencias-cross-sell`, { params: { userId: uid } })
      .pipe(catchError(() => of([])));
  }

  verificarPreciosCheckout(opts?: {
    lineasCliente?: { productId: string; precioUnitario: number; cantidad: number }[];
    totalCliente?: number;
  }): Observable<VerificarPreciosResponseDto> {
    const uid = this.requireClienteUserId();
    const lineasCliente =
      opts?.lineasCliente ??
      this.lines().map((l) => ({
        productId: l.productId,
        precioUnitario: l.unitPrice,
        cantidad: l.quantity,
      }));
    const totalCliente = opts?.totalCliente ?? this.totalOrden();
    return this.http
      .post<VerificarPreciosResponseDto>(`${API_CARRITO}/verificar-precios`, {
        userId: uid,
        lineasCliente,
        totalCliente,
      })
      .pipe(
        tap((res) => {
          if (res.carritoActualizado) {
            this.applyCarritoResponse(res.carritoActualizado);
          }
        }),
      );
  }
}
