import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import {
  GraficoDashboardDto,
  UsuarioDashboardDto,
  UsuarioDashboardService,
} from '../../services/usuario-dashboard.service';
import { ThemeService } from '../../services/theme.service';
import { destruirChart, opcionesBaseChart, paletaIngredientes } from '../../shared/chart-tema.util';
import { ContenidoBloqueadoPlanComponent } from '../shared/contenido-bloqueado-plan/contenido-bloqueado-plan';
import { obtenerPlanDetalle } from '../../data/plan-detalles';

Chart.register(...registerables);

@Component({
  selector: 'app-usuario-dashboard-seccion',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, ContenidoBloqueadoPlanComponent],
  templateUrl: './usuario-dashboard-seccion.component.html',
})
export class UsuarioDashboardSeccionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasInferencias') canvasInferencias?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasModos') canvasModos?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasCosto') canvasCosto?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasExportaciones') canvasExportaciones?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasSemaforo') canvasSemaforo?: ElementRef<HTMLCanvasElement>;

  private readonly dashboardService = inject(UsuarioDashboardService);
  private readonly theme = inject(ThemeService);
  private subTema?: Subscription;

  cargando = signal(true);
  error = signal('');
  datos = signal<UsuarioDashboardDto | null>(null);

  private chartInferencias?: Chart;
  private chartModos?: Chart;
  private chartCosto?: Chart;
  private chartExportaciones?: Chart;
  private chartSemaforo?: Chart;

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.subTema = this.theme.themeChanged.subscribe(() => this.renderizarGraficos());
  }

  ngOnDestroy(): void {
    this.subTema?.unsubscribe();
    this.destruirGraficos();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.dashboardService.obtenerDashboard().subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
        setTimeout(() => this.renderizarGraficos(), 0);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar el dashboard.');
      },
    });
  }

  nombrePlan(rol?: string): string {
    return obtenerPlanDetalle(rol).nombre;
  }

  pctCuota(d: UsuarioDashboardDto): number {
    const limite = d.cuota?.limiteInferencias ?? 0;
    const usadas = d.cuota?.inferenciasUsadas ?? 0;
    if (limite <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((usadas / limite) * 100));
  }

  pctHistorial(d: UsuarioDashboardDto): number {
    const limite = d.cuota?.limiteHistorial ?? 0;
    const usadas = d.cuota?.historialUsado ?? 0;
    if (limite <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((usadas / limite) * 100));
  }

  textoCuota(d: UsuarioDashboardDto): string {
    const limite = d.cuota?.limiteInferencias ?? 0;
    const usadas = d.cuota?.inferenciasUsadas ?? 0;
    if (limite < 0) {
      return `${usadas} usadas`;
    }
    return `${usadas} / ${limite}`;
  }

  textoHistorial(d: UsuarioDashboardDto): string {
    const limite = d.cuota?.limiteHistorial ?? 0;
    const usadas = d.cuota?.historialUsado ?? 0;
    if (limite < 0) {
      return `${usadas} guardadas`;
    }
    return `${usadas} / ${limite}`;
  }

  formatearMae(valor?: number | null): string {
    if (valor == null) {
      return '—';
    }
    return valor.toFixed(4);
  }

  formatearCalificacion(valor?: number | null): string {
    if (valor == null) {
      return '—';
    }
    return `${valor.toFixed(1)}/5`;
  }

  formatearCosto(valor?: number | null): string {
    if (valor == null) {
      return '—';
    }
    return `S/ ${valor.toFixed(2)}`;
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) {
      return '—';
    }
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  sinActividad(d: UsuarioDashboardDto): boolean {
    return (d.cuota?.inferenciasUsadas ?? 0) === 0 && (d.recetasRecientes?.length ?? 0) === 0;
  }

  private renderizarGraficos(): void {
    const d = this.datos();
    if (!d) {
      return;
    }
    this.destruirGraficos();
    this.renderizarLineaBarras(
      this.canvasInferencias,
      d.graficos.inferenciasPorMes,
      'bar',
      (c) => (this.chartInferencias = c),
    );
    this.renderizarDona(this.canvasModos, d.graficos.modosOptimizacion, (c) => (this.chartModos = c));
    this.renderizarLineaBarras(
      this.canvasCosto,
      d.graficos.costoHistorial,
      'line',
      (c) => (this.chartCosto = c),
    );
    this.renderizarLineaBarras(
      this.canvasExportaciones,
      d.graficos.exportaciones,
      'bar',
      (c) => (this.chartExportaciones = c),
    );
    this.renderizarDona(
      this.canvasSemaforo,
      d.graficos.semaforoResumen,
      (c) => (this.chartSemaforo = c),
    );
  }

  private renderizarLineaBarras(
    ref: ElementRef<HTMLCanvasElement> | undefined,
    grafico: GraficoDashboardDto,
    tipo: 'bar' | 'line',
    asignar: (c: Chart) => void,
  ): void {
    const canvas = ref?.nativeElement;
    if (!canvas || !grafico?.etiquetas?.length) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const chart = new Chart(ctx, {
      type: tipo,
      data: {
        labels: grafico.etiquetas,
        datasets: [
          {
            data: grafico.valores,
            backgroundColor: tipo === 'bar' ? '#0056B3' : 'rgba(0, 86, 179, 0.15)',
            borderColor: '#0056B3',
            borderWidth: tipo === 'line' ? 2 : 0,
            fill: tipo === 'line',
            tension: 0.3,
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        plugins: { ...opcionesBaseChart().plugins, legend: { display: false } },
      },
    });
    asignar(chart);
  }

  private renderizarDona(
    ref: ElementRef<HTMLCanvasElement> | undefined,
    grafico: GraficoDashboardDto,
    asignar: (c: Chart) => void,
  ): void {
    const canvas = ref?.nativeElement;
    if (!canvas || !grafico?.etiquetas?.length) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const colores = paletaIngredientes();
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: grafico.etiquetas,
        datasets: [
          {
            data: grafico.valores,
            backgroundColor: grafico.etiquetas.map((_, i) => colores[i % colores.length]),
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        scales: undefined,
      },
    });
    asignar(chart);
  }

  private destruirGraficos(): void {
    destruirChart(this.chartInferencias);
    destruirChart(this.chartModos);
    destruirChart(this.chartCosto);
    destruirChart(this.chartExportaciones);
    destruirChart(this.chartSemaforo);
    this.chartInferencias = undefined;
    this.chartModos = undefined;
    this.chartCosto = undefined;
    this.chartExportaciones = undefined;
    this.chartSemaforo = undefined;
  }
}
