import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import {
  LimiteNormativoRow,
  LimitesNormativosAdminService,
} from '../../services/limites-normativos-admin.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

type ModalLimites =
  | { tipo: 'ok' | 'error'; titulo: string; mensaje: string }
  | { tipo: 'pendientes'; cambios: string[] }
  | { tipo: 'confirmar'; cambios: string[] }
  | null;

@Component({
  selector: 'app-admin-limites-normativos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-limites-normativos.component.html',
})
export class AdminLimitesNormativosComponent implements OnInit {
  private readonly limitesService = inject(LimitesNormativosAdminService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly pestanaActiva = signal<'codex_alimentarius' | 'ley_30021'>('codex_alimentarius');
  readonly items = signal<LimiteNormativoRow[]>([]);
  readonly modal = signal<ModalLimites>(null);

  private filasOriginales = new Map<number, LimiteNormativoRow>();
  private filasDirty = new Map<number, LimiteNormativoRow>();
  private accionPendiente: (() => void) | null = null;

  readonly interceptarCerrarSesion = (): boolean => {
    if (this.filasDirty.size === 0) {
      return true;
    }
    this.accionPendiente = () => this.ejecutarCerrarSesion();
    this.modal.set({ tipo: 'pendientes', cambios: this.listarResumenCambios() });
    return false;
  };

  ngOnInit(): void {
    this.cargarLimites();
  }

  filasVisibles(): LimiteNormativoRow[] {
    return this.items().filter((f) => f.normativa === this.pestanaActiva());
  }

  cantidadCambiosPendientes(): number {
    return this.filasDirty.size;
  }

  cambiarPestana(normativa: 'codex_alimentarius' | 'ley_30021'): void {
    if (this.pestanaActiva() === normativa) {
      return;
    }
    this.confirmarSiHayCambios(() => this.pestanaActiva.set(normativa));
  }

  solicitarIrPanel(event: Event): void {
    event.preventDefault();
    this.confirmarSiHayCambios(() => void this.router.navigate(['/gestion-administrador']));
  }

  onValorChange(fila: LimiteNormativoRow, valor: string | number): void {
    const n = valor === '' || valor === null ? null : Number(valor);
    fila.valorMaximo = n as number;
    this.actualizarEstadoFila(fila);
  }

  onDescripcionChange(fila: LimiteNormativoRow): void {
    this.actualizarEstadoFila(fila);
  }

  guardarCambios(alContinuar?: () => void): void {
    const pendientes = Array.from(this.filasDirty.values());
    if (pendientes.length === 0) {
      if (!alContinuar) {
        this.mostrarError('No hay cambios pendientes por guardar.');
      }
      return;
    }
    for (const fila of pendientes) {
      const err = this.validarFila(fila);
      if (err) {
        this.mostrarError(err);
        return;
      }
    }
    if (!alContinuar) {
      this.modal.set({ tipo: 'confirmar', cambios: this.listarResumenCambios() });
      this.accionPendiente = () => this.ejecutarGuardado();
      return;
    }
    this.ejecutarGuardado(alContinuar);
  }

  confirmarGuardado(): void {
    this.modal.set(null);
    this.ejecutarGuardado(this.accionPendiente ?? undefined);
    this.accionPendiente = null;
  }

  cancelarConfirmacion(): void {
    this.accionPendiente = null;
    this.modal.set(null);
  }

  guardarDesdeModalPendientes(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;
    this.modal.set(null);
    this.guardarCambios(() => accion?.());
  }

  descartarCambiosPendientes(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;
    this.filasDirty.clear();
    this.items.update((lista) =>
      lista.map((fila) => {
        const orig = this.filasOriginales.get(fila.id);
        return orig ? { ...this.clonarFila(orig), _dirty: false } : { ...fila, _dirty: false };
      }),
    );
    this.modal.set(null);
    accion?.();
  }

  cancelarModalPendientes(): void {
    this.accionPendiente = null;
    this.modal.set(null);
  }

  cerrarModal(): void {
    const m = this.modal();
    if (m?.tipo === 'pendientes') {
      this.cancelarModalPendientes();
      return;
    }
    if (m?.tipo === 'confirmar') {
      this.cancelarConfirmacion();
      return;
    }
    this.modal.set(null);
  }

  etiquetaNormativa(normativa: string): string {
    if (normativa === 'codex_alimentarius') {
      return 'Codex Alimentarius';
    }
    if (normativa === 'ley_30021') {
      return 'Ley N° 30021';
    }
    return normativa;
  }

  trackFila(_: number, row: LimiteNormativoRow): number {
    return row.id;
  }

  private cargarLimites(): void {
    this.cargando.set(true);
    this.limitesService.listar().subscribe({
      next: (res) => {
        this.filasOriginales.clear();
        this.filasDirty.clear();
        const lista = (res.items ?? []).map((f) => {
          const fila = { ...f, _dirty: false };
          this.filasOriginales.set(fila.id, this.clonarFila(fila));
          return fila;
        });
        this.items.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudieron cargar los límites normativos.');
      },
    });
  }

  private ejecutarGuardado(alContinuar?: () => void): void {
    const pendientes = Array.from(this.filasDirty.values());
    const cambios = pendientes.map((f) => ({
      id: f.id,
      valorMaximo: Number(f.valorMaximo),
      descripcion: f.descripcion?.trim() || null,
    }));
    this.guardando.set(true);
    this.limitesService.guardarCambios(cambios).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.filasDirty.clear();
        this.filasOriginales.clear();
        const lista = (res.items ?? []).map((f) => {
          const fila = { ...f, _dirty: false };
          this.filasOriginales.set(fila.id, this.clonarFila(fila));
          return fila;
        });
        this.items.set(lista);
        if (alContinuar) {
          alContinuar();
        } else {
          this.mostrarOk('Cambios guardados', res.message);
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudieron guardar los cambios.');
      },
    });
  }

  private confirmarSiHayCambios(accion: () => void): void {
    if (this.filasDirty.size === 0) {
      accion();
      return;
    }
    this.accionPendiente = accion;
    this.modal.set({ tipo: 'pendientes', cambios: this.listarResumenCambios() });
  }

  private actualizarEstadoFila(fila: LimiteNormativoRow): void {
    const original = this.filasOriginales.get(fila.id);
    if (original && this.filasIguales(fila, original)) {
      fila._dirty = false;
      this.filasDirty.delete(fila.id);
    } else {
      fila._dirty = true;
      this.filasDirty.set(fila.id, fila);
    }
    this.items.update((lista) => lista.map((r) => (r.id === fila.id ? { ...fila } : r)));
  }

  private filasIguales(a: LimiteNormativoRow, b: LimiteNormativoRow): boolean {
    return (
      this.numeroIgual(a.valorMaximo, b.valorMaximo) &&
      this.textoIgual(a.descripcion, b.descripcion)
    );
  }

  private clonarFila(f: LimiteNormativoRow): LimiteNormativoRow {
    return {
      id: f.id,
      normativa: f.normativa,
      nutriente: f.nutriente,
      etiquetaNutriente: f.etiquetaNutriente,
      valorMaximo: f.valorMaximo,
      unidad: f.unidad,
      descripcion: f.descripcion ?? null,
      actualizadoEn: f.actualizadoEn,
      actualizadoPor: f.actualizadoPor,
      actualizadoPorEmail: f.actualizadoPorEmail,
      _dirty: false,
    };
  }

  private listarResumenCambios(): string[] {
    return Array.from(this.filasDirty.values()).map((f) => this.resumirCambiosFila(f));
  }

  private resumirCambiosFila(fila: LimiteNormativoRow): string {
    const etiqueta = fila.etiquetaNutriente || fila.nutriente;
    const original = this.filasOriginales.get(fila.id);
    if (!original) {
      return etiqueta;
    }
    const detalles: string[] = [];
    if (!this.numeroIgual(fila.valorMaximo, original.valorMaximo)) {
      detalles.push(
        `valor máximo: ${this.fmtNum(original.valorMaximo)} → ${this.fmtNum(fila.valorMaximo)} ${fila.unidad}`,
      );
    }
    if (!this.textoIgual(fila.descripcion, original.descripcion)) {
      detalles.push(
        `descripción: ${this.fmt(original.descripcion)} → ${this.fmt(fila.descripcion)}`,
      );
    }
    return detalles.length ? `${etiqueta} (${detalles.join('; ')})` : etiqueta;
  }

  private validarFila(fila: LimiteNormativoRow): string | null {
    const etiqueta = fila.etiquetaNutriente || fila.nutriente;
    const n = Number(fila.valorMaximo);
    if (Number.isNaN(n) || n <= 0) {
      return `${etiqueta}: el valor máximo debe ser mayor que cero.`;
    }
    return null;
  }

  private numeroIgual(a: unknown, b: unknown): boolean {
    const na = a === null || a === undefined || a === '' ? null : Number(a);
    const nb = b === null || b === undefined || b === '' ? null : Number(b);
    if (na === null && nb === null) {
      return true;
    }
    if (na === null || nb === null || Number.isNaN(na) || Number.isNaN(nb)) {
      return false;
    }
    return Math.abs(na - nb) < 0.0001;
  }

  private textoIgual(a: unknown, b: unknown): boolean {
    const ta = a == null ? '' : String(a).trim();
    const tb = b == null ? '' : String(b).trim();
    return ta === tb;
  }

  private fmt(v: unknown): string {
    if (v == null || String(v).trim() === '') {
      return '—';
    }
    return String(v);
  }

  private fmtNum(v: unknown): string {
    if (v == null || v === '') {
      return '—';
    }
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n.toString();
  }

  private mostrarOk(titulo: string, mensaje: string): void {
    this.modal.set({ tipo: 'ok', titulo, mensaje });
  }

  private mostrarError(mensaje: string): void {
    this.modal.set({ tipo: 'error', titulo: 'Error', mensaje });
  }

  private ejecutarCerrarSesion(): void {
    this.auth.clearSession();
    this.theme.onLogout();
    void this.router.navigate(['/presentacion']);
  }
}
