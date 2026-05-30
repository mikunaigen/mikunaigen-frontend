import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { AlternativaRecetaDto } from '../../services/formulacion-inferencia.service';
import { ThemeService } from '../../services/theme.service';
import {
  coloresChartOscuro,
  destruirChart,
  opcionesBaseChart,
  paletaIngredientes,
} from '../../shared/chart-tema.util';

Chart.register(...registerables);

@Component({
  selector: 'app-graficos-receta-formulacion',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './graficos-receta-formulacion.component.html',
})
export class GraficosRecetaFormulacionComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) alternativa!: AlternativaRecetaDto;

  @ViewChild('canvasComposicion') canvasComposicion?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasPrecision') canvasPrecision?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasSemaforo') canvasSemaforo?: ElementRef<HTMLCanvasElement>;

  private readonly theme = inject(ThemeService);
  private subTema?: Subscription;
  private chartComposicion?: Chart;
  private chartPrecision?: Chart;
  private chartSemaforo?: Chart;

  nutrientesPrecision = [
    'energia_kcal',
    'proteinas_g',
    'hierro_mg',
    'calcio_mg',
    'vitamina_c_mg',
    'fibra_dietaria_g',
  ];

  clavesSemaforo = ['sodio_mg', 'grasa_total_g', 'carbohidratos_disponibles_g'];

  ngAfterViewInit(): void {
    this.subTema = this.theme.themeChanged.subscribe(() => this.renderizarGraficos());
    this.renderizarGraficos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alternativa'] && !changes['alternativa'].firstChange) {
      this.renderizarGraficos();
    }
  }

  ngOnDestroy(): void {
    this.subTema?.unsubscribe();
    this.destruirTodos();
  }

  etiquetaNutriente(key: string): string {
    return key
      .replace(/_mg|_g|_kcal|_ug/g, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private renderizarGraficos(): void {
    setTimeout(() => {
      if (!this.canvasComposicion || !this.canvasPrecision || !this.canvasSemaforo) {
        return;
      }
      this.destruirTodos();
      this.crearComposicion();
      this.crearPrecision();
      this.crearSemaforo();
    }, 0);
  }

  private crearComposicion(): void {
    const canvas = this.canvasComposicion?.nativeElement;
    if (!canvas) return;
    const items = (this.alternativa.ingredientes || []).map((i) => ({
      nombre: i.nombre || '—',
      pct: Number(i.porcentaje || 0),
    }));
    const umbral = 5;
    const principales = items.filter((i) => i.pct >= umbral);
    const otros = items.filter((i) => i.pct < umbral);
    const etiquetas = principales.map((i) => i.nombre);
    const valores = principales.map((i) => i.pct);
    if (otros.length > 0) {
      etiquetas.push('Otros');
      valores.push(otros.reduce((s, i) => s + i.pct, 0));
    }
    this.chartComposicion = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: etiquetas,
        datasets: [{
          data: valores,
          backgroundColor: paletaIngredientes().slice(0, etiquetas.length),
          borderWidth: coloresChartOscuro() ? 0 : 1,
        }],
      },
      options: {
        ...opcionesBaseChart(),
        plugins: {
          ...opcionesBaseChart().plugins,
          legend: { position: 'bottom', labels: { color: coloresChartOscuro() ? '#e2e8f0' : '#374151' } },
        },
      },
    });
  }

  private crearPrecision(): void {
    const canvas = this.canvasPrecision?.nativeElement;
    if (!canvas) return;
    const perfil = this.alternativa.perfilNutricional || {};
    const etiquetas = this.nutrientesPrecision.map((k) => this.etiquetaNutriente(k));
    const objetivos = this.nutrientesPrecision.map((k) => perfil[k]?.objetivo ?? 0);
    const logrados = this.nutrientesPrecision.map((k) => perfil[k]?.logrado ?? 0);
    this.chartPrecision = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Objetivo',
            data: objetivos,
            backgroundColor: coloresChartOscuro() ? 'rgba(100, 116, 139, 0.7)' : 'rgba(156, 163, 175, 0.8)',
          },
          {
            label: 'Logrado',
            data: logrados,
            backgroundColor: coloresChartOscuro() ? 'rgba(34, 197, 94, 0.75)' : 'rgba(40, 167, 69, 0.85)',
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        scales: {
          x: { ...(opcionesBaseChart().scales?.['x'] ?? {}), stacked: false },
          y: { ...(opcionesBaseChart().scales?.['y'] ?? {}), beginAtZero: true },
        },
      },
    });
  }

  private crearSemaforo(): void {
    const canvas = this.canvasSemaforo?.nativeElement;
    if (!canvas) return;
    const perfil = this.alternativa.perfilNutricional || {};
    const detalle = this.alternativa.semaforoDetalle || {};
    const etiquetas = this.clavesSemaforo.map((k) => this.etiquetaNutriente(k));
    const logrados = this.clavesSemaforo.map((k) => perfil[k]?.logrado ?? 0);
    const umbrales = this.clavesSemaforo.map((k) => Number(detalle[k]?.['umbral'] ?? 0));
    const colores = this.clavesSemaforo.map((k) => {
      const color = this.alternativa.semaforo?.[k];
      if (color === 'ROJO') return coloresChartOscuro() ? '#ef4444' : '#dc3545';
      if (color === 'AMARILLO') return coloresChartOscuro() ? '#fbbf24' : '#d48806';
      return coloresChartOscuro() ? '#22c55e' : '#28a745';
    });
    this.chartSemaforo = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Valor logrado',
            data: logrados,
            backgroundColor: colores,
          },
          {
            label: 'Umbral Ley 30021',
            data: umbrales,
            type: 'line',
            borderColor: coloresChartOscuro() ? '#f59e0b' : '#d48806',
            backgroundColor: 'transparent',
            borderDash: [6, 4],
            pointRadius: 4,
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        indexAxis: 'y',
        scales: {
          x: { ...(opcionesBaseChart().scales?.['x'] ?? {}), beginAtZero: true },
          y: { ...(opcionesBaseChart().scales?.['y'] ?? {}) },
        },
      },
    });
  }

  private destruirTodos(): void {
    destruirChart(this.chartComposicion);
    destruirChart(this.chartPrecision);
    destruirChart(this.chartSemaforo);
    this.chartComposicion = undefined;
    this.chartPrecision = undefined;
    this.chartSemaforo = undefined;
  }
}
