import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment';
import { IaConfigService } from '../../services/ia-config.service';

interface PuntoCurva {
  epoca: number;
  trainError?: number | null;
  valError?: number | null;
}

interface EstadoEntrenamiento {
  jobId?: string | null;
  estado: string;
  epoca: number;
  epocasTotales: number;
  trainError?: number | null;
  valError?: number | null;
  trainLoss?: number | null;
  valLoss?: number | null;
  mensaje?: string;
  datasetB2Key?: string | null;
  modeloB2Key?: string | null;
  escaladorB2Key?: string | null;
  enCurso: boolean;
  progresoPorcentaje: number;
  curva: PuntoCurva[];
}

@Component({
  selector: 'app-admin-modelos-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './admin-modelos-ia.component.html',
})
export class AdminModelosIaComponent implements OnInit, OnDestroy {
  private readonly apiIa = environment.apiUrl + '/ia-modelos';
  private wsEntrenamientoSub?: Subscription;

  iniciandoEntrenamiento = false;
  entrenamiento: EstadoEntrenamiento = {
    estado: 'IDLE',
    epoca: 0,
    epocasTotales: 50,
    enCurso: false,
    progresoPorcentaje: 0,
    curva: [],
  };
  puntosCurvaSvg: PuntoCurva[] = [];
  private estadoEntrenamientoPrevio = 'IDLE';

  cargandoIa = false;
  guardandoIa = false;
  iaActiva = false;
  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '' };

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private iaConfig: IaConfigService,
  ) {}

  ngOnInit(): void {
    this.cargarEstadoIa();
    this.cargarEstadoEntrenamiento();
    this.wsEntrenamientoSub = this.websocketService
      .subscribeToTopic('/topic/admin/entrenamiento-ia')
      .subscribe((raw) => this.onEntrenamientoWs(raw));
  }

  ngOnDestroy(): void {
    this.wsEntrenamientoSub?.unsubscribe();
  }

  cargarEstadoIa(): void {
    this.cargandoIa = true;
    this.http.get<{ iaActiva?: boolean }>(`${this.apiIa}/estado`).subscribe({
      next: (resp) => {
        this.cargandoIa = false;
        this.iaActiva = !!resp?.iaActiva;
        this.iaConfig.aplicarDesdeAdmin({ iaActiva: this.iaActiva, slots: [] });
      },
      error: () => {
        this.cargandoIa = false;
      },
    });
  }

  actualizarSwitchIa(): void {
    const valor = this.iaActiva;
    this.guardandoIa = true;
    this.http.patch<{ iaActiva?: boolean }>(`${this.apiIa}/toggle`, { iaActiva: valor }).subscribe({
      next: (resp) => {
        this.guardandoIa = false;
        this.iaActiva = !!resp?.iaActiva;
        this.iaConfig.aplicarDesdeAdmin({ iaActiva: this.iaActiva, slots: [] });
      },
      error: () => {
        this.guardandoIa = false;
        this.iaActiva = !valor;
        this.cargarEstadoIa();
        this.abrirModal('error', 'IA', 'No se pudo actualizar el interruptor de IA.');
      },
    });
  }

  iniciarEntrenamiento(): void {
    if (this.entrenamiento.enCurso || this.iniciandoEntrenamiento) {
      return;
    }
    this.iniciandoEntrenamiento = true;
    this.http.post<Record<string, unknown>>(`${this.apiIa}/entrenamiento/iniciar`, {}).subscribe({
      next: (resp) => {
        this.iniciandoEntrenamiento = false;
        this.aplicarEstadoEntrenamiento(resp);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.iniciandoEntrenamiento = false;
        this.abrirModal(
          'error',
          'Entrenamiento',
          err?.error?.message || 'No se pudo iniciar el pipeline de reentrenamiento.',
        );
        this.cdr.detectChanges();
      },
    });
  }

  cargarEstadoEntrenamiento(): void {
    this.http.get<Record<string, unknown>>(`${this.apiIa}/entrenamiento/estado`).subscribe({
      next: (resp) => this.aplicarEstadoEntrenamiento(resp),
      error: () => {},
    });
  }

  etiquetaEstadoEntrenamiento(): string {
    const e = (this.entrenamiento.estado || 'IDLE').toUpperCase();
    if (e === 'PREPARANDO_DATASET') return 'Preparando dataset';
    if (e === 'INVOCANDO_KAGGLE') return 'Invocando Kaggle';
    if (e === 'ENTRENANDO') return 'Entrenando';
    if (e === 'COMPLETADO') return 'Completado';
    if (e === 'ERROR') return 'Error';
    return 'Inactivo';
  }

  claseEstadoEntrenamiento(): string {
    const e = (this.entrenamiento.estado || 'IDLE').toUpperCase();
    if (e === 'COMPLETADO') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:text-emerald-200';
    }
    if (e === 'ERROR') {
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/35 dark:text-red-200';
    }
    if (this.entrenamiento.enCurso || e === 'ENTRENANDO') {
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-200';
    }
    return 'border-gray-200 bg-gray-100 text-neutral-strong dark:border-dark-border dark:bg-slate-900 dark:text-dark-text-muted';
  }

  polylineTrain(): string {
    return this.construirPolyline('trainError');
  }

  polylineVal(): string {
    return this.construirPolyline('valError');
  }

  abrirModal(tipo: string, titulo: string, mensaje: string): void {
    this.modal = { visible: true, tipo, titulo, mensaje };
  }

  cerrarModal(): void {
    this.modal.visible = false;
  }

  private construirPolyline(campo: 'trainError' | 'valError'): string {
    const puntos = this.puntosCurvaSvg;
    if (!puntos.length) {
      return '';
    }
    const valores = puntos
      .map((p) => p[campo])
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (!valores.length) {
      return '';
    }
    const max = Math.max(...valores, 0.0001);
    const min = Math.min(...valores, 0);
    const rango = max - min || max;
    const ancho = 320;
    const alto = 140;
    const baseY = 150;
    return puntos
      .map((p, i) => {
        const v = p[campo];
        if (v == null || Number.isNaN(v)) {
          return null;
        }
        const x = puntos.length === 1 ? ancho / 2 : (i / (puntos.length - 1)) * ancho;
        const y = baseY - ((v - min) / rango) * alto;
        return `${x},${y}`;
      })
      .filter((s): s is string => s != null)
      .join(' ');
  }

  private aplicarEstadoEntrenamiento(raw: Record<string, unknown>): void {
    const estadoNuevo = String(raw['estado'] || 'IDLE').toUpperCase();
    const curva = Array.isArray(raw['curva']) ? (raw['curva'] as PuntoCurva[]) : [];
    this.entrenamiento = {
      jobId: (raw['jobId'] as string) ?? null,
      estado: String(raw['estado'] || 'IDLE'),
      epoca: Number(raw['epoca'] || 0),
      epocasTotales: Number(raw['epocasTotales'] || 50),
      trainError: raw['trainError'] != null ? Number(raw['trainError']) : null,
      valError: raw['valError'] != null ? Number(raw['valError']) : null,
      trainLoss: raw['trainLoss'] != null ? Number(raw['trainLoss']) : null,
      valLoss: raw['valLoss'] != null ? Number(raw['valLoss']) : null,
      mensaje: raw['mensaje'] != null ? String(raw['mensaje']) : '',
      datasetB2Key: (raw['datasetB2Key'] as string) ?? null,
      modeloB2Key: (raw['modeloB2Key'] as string) ?? null,
      escaladorB2Key: (raw['escaladorB2Key'] as string) ?? null,
      enCurso: !!raw['enCurso'],
      progresoPorcentaje: Number(raw['progresoPorcentaje'] || 0),
      curva,
    };
    this.puntosCurvaSvg = curva;
    if (
      estadoNuevo === 'ERROR' &&
      this.estadoEntrenamientoPrevio !== 'ERROR' &&
      this.entrenamiento.mensaje
    ) {
      this.abrirModal('error', 'Entrenamiento', this.entrenamiento.mensaje);
    }
    if (estadoNuevo === 'COMPLETADO' && this.estadoEntrenamientoPrevio !== 'COMPLETADO') {
      this.abrirModal('exito', 'Entrenamiento', 'El modelo se desplegó correctamente en Backblaze B2.');
    }
    this.estadoEntrenamientoPrevio = estadoNuevo;
  }

  private onEntrenamientoWs(raw: string): void {
    this.ngZone.run(() => {
      try {
        const o = JSON.parse(raw) as Record<string, unknown>;
        if (o['kind'] !== 'entrenamiento_estado') {
          return;
        }
        this.aplicarEstadoEntrenamiento(o);
        this.cdr.detectChanges();
      } catch {
        return;
      }
    });
  }
}
