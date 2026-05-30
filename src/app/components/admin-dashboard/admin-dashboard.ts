import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment';
import { ThemeService } from '../../services/theme.service';
import { destruirChart, opcionesBaseChart } from '../../shared/chart-tema.util';

Chart.register(...registerables);

const API_KPIS = environment.apiUrl + '/admin/dashboard/kpis';

export interface KpiItem {
  nombre: string;
  valor: string;
  valorNumerico?: number;
  unidad?: string;
  formula: string;
  tendencia: 'up' | 'down' | string;
}

export interface GraficosKpis {
  barras?: { etiquetas: string[]; valores: number[] };
  actividadDiaria?: {
    fechas: string[];
    accesos: number[];
    inferencias: number[];
    errores: number[];
  };
}

export interface KpisRespuesta {
  desde?: string;
  hasta?: string;
  fechaMinima?: string | null;
  kpis: KpiItem[];
  graficos?: GraficosKpis;
  alertaPrecision?: boolean;
  alertaTiempoRespuesta?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasBarrasKpi') canvasBarrasKpi?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasActividad') canvasActividad?: ElementRef<HTMLCanvasElement>;

  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);
  private subTema?: Subscription;
  private chartBarras?: Chart;
  private chartActividad?: Chart;

  fromDate = '';
  toDate = '';
  fechaMinima = '';
  fechaMaxima = '';
  cargando = false;
  errorMsg = '';
  datos: KpisRespuesta | null = null;

  ngOnInit(): void {
    const hoy = new Date();
    const haceMes = new Date(hoy);
    haceMes.setMonth(haceMes.getMonth() - 1);
    this.fechaMaxima = this.aYmd(hoy);
    this.toDate = this.fechaMaxima;
    this.fromDate = this.aYmd(haceMes);
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.subTema = this.theme.themeChanged.subscribe(() => this.renderizarGraficos());
  }

  ngOnDestroy(): void {
    this.subTema?.unsubscribe();
    this.destruirGraficos();
  }

  aplicarRango(): void {
    this.normalizarFechas();
    this.cargar();
  }

  usarPrimerRegistro(): void {
    if (this.fechaMinima) {
      this.fromDate = this.fechaMinima.substring(0, 10);
    }
    this.normalizarFechas();
    this.cargar();
  }

  private normalizarFechas(): void {
    if (this.fechaMinima && this.fromDate < this.fechaMinima.substring(0, 10)) {
      this.fromDate = this.fechaMinima.substring(0, 10);
    }
    if (this.toDate > this.fechaMaxima) {
      this.toDate = this.fechaMaxima;
    }
    if (this.fromDate > this.toDate) {
      this.fromDate = this.toDate;
    }
  }

  private aYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  cargar(): void {
    if (!this.fromDate || !this.toDate) {
      return;
    }
    this.normalizarFechas();
    this.cargando = true;
    this.errorMsg = '';
    const params = new HttpParams()
      .set('desde', `${this.fromDate}T00:00:00`)
      .set('hasta', `${this.toDate}T23:59:59`);
    this.http.get<KpisRespuesta>(API_KPIS, { params }).subscribe({
      next: (d) => {
        this.datos = d;
        if (d.fechaMinima) {
          this.fechaMinima = d.fechaMinima.substring(0, 10);
        }
        this.cargando = false;
        setTimeout(() => this.renderizarGraficos(), 100);
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los indicadores.';
        this.cargando = false;
      },
    });
  }

  iconoTendencia(t: string): string {
    return t === 'down' ? 'heroArrowTrendingDown' : 'heroArrowTrendingUp';
  }

  claseTendencia(t: string): string {
    if (t === 'down') {
      return 'text-danger';
    }
    return 'text-success';
  }

  trackKpi(_: number, k: KpiItem): string {
    return k.nombre;
  }

  private renderizarGraficos(): void {
    if (!this.datos?.graficos) {
      return;
    }
    this.destruirGraficos();
    this.renderizarBarras();
    this.renderizarActividad();
  }

  private renderizarBarras(): void {
    const canvas = this.canvasBarrasKpi?.nativeElement;
    const datos = this.datos?.graficos?.barras;
    if (!canvas || !datos?.etiquetas?.length) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const oscuro = document.documentElement.classList.contains('dark');
    this.chartBarras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datos.etiquetas.map((e) => this.abreviarEtiqueta(e)),
        datasets: [
          {
            label: 'Valor numérico',
            data: datos.valores,
            backgroundColor: oscuro ? 'rgba(59, 130, 246, 0.65)' : 'rgba(0, 86, 179, 0.75)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        indexAxis: 'y',
        plugins: {
          ...opcionesBaseChart().plugins,
          legend: { display: false },
        },
      },
    });
  }

  private renderizarActividad(): void {
    const canvas = this.canvasActividad?.nativeElement;
    const datos = this.datos?.graficos?.actividadDiaria;
    if (!canvas || !datos?.fechas?.length) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const etiquetas = datos.fechas.map((f) => f.substring(5));
    this.chartActividad = new Chart(ctx, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Accesos',
            data: datos.accesos,
            borderColor: '#0056B3',
            backgroundColor: 'rgba(0, 86, 179, 0.12)',
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Inferencias',
            data: datos.inferencias,
            borderColor: '#28A745',
            backgroundColor: 'rgba(40, 167, 69, 0.08)',
            tension: 0.25,
            fill: false,
          },
          {
            label: 'Errores',
            data: datos.errores,
            borderColor: '#DC3545',
            backgroundColor: 'rgba(220, 53, 69, 0.08)',
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        plugins: {
          ...opcionesBaseChart().plugins,
          legend: { display: true },
        },
      },
    });
  }

  private abreviarEtiqueta(texto: string): string {
    if (texto.length <= 22) {
      return texto;
    }
    return texto.substring(0, 20) + '…';
  }

  private destruirGraficos(): void {
    destruirChart(this.chartBarras);
    destruirChart(this.chartActividad);
    this.chartBarras = undefined;
    this.chartActividad = undefined;
  }
}
