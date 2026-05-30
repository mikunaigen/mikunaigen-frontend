import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { AlternativaRecetaDto } from '../../services/formulacion-inferencia.service';
import { ThemeService } from '../../services/theme.service';
import {
  TipoGraficoExpandido,
  claseDesviacionPorcentual,
  etiquetaNutrienteFormulacion,
  esNutricionistaRol,
  nutrientesPrecisionCompletos,
  puedeDescargarGrafico,
  puedeVerCostoProduccion,
  porcentajeDesviacion,
} from '../../utils/grafico-formulacion.util';
import { nombreGrupoAlimento } from '../../utils/grupos-alimentos.util';
import {
  coloresChartOscuro,
  destruirChart,
  opcionesBaseChart,
  paletaIngredientes,
} from '../../shared/chart-tema.util';

Chart.register(...registerables);

@Component({
  selector: 'app-detalle-grafico-receta-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './detalle-grafico-receta-modal.component.html',
})
export class DetalleGraficoRecetaModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) alternativa!: AlternativaRecetaDto;
  @Input({ required: true }) tipo!: TipoGraficoExpandido;
  @Input() visible = false;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('canvasPrincipal') canvasPrincipal?: ElementRef<HTMLCanvasElement>;
  @ViewChildren('canvasSemaforoItem') canvasesSemaforo!: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly theme = inject(ThemeService);
  private subTema?: Subscription;
  private chartPrincipal?: Chart;
  private chartsSemaforo: Chart[] = [];
  panelNormativoExtendido = false;

  readonly clavesSemaforo = ['sodio_mg', 'grasa_total_g', 'carbohidratos_disponibles_g'];

  ngAfterViewInit(): void {
    this.subTema = this.theme.themeChanged.subscribe(() => this.renderizar());
    this.canvasesSemaforo.changes.subscribe(() => {
      if (this.visible && this.tipo === 'semaforo') {
        this.renderSemaforo();
      }
    });
    this.renderizar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['tipo'] || changes['alternativa']) {
      this.panelNormativoExtendido = false;
      setTimeout(() => this.renderizar(), 0);
    }
  }

  ngOnDestroy(): void {
    this.subTema?.unsubscribe();
    this.destruirCharts();
  }

  get rol(): string {
    return this.alternativa.rol || 'estudiante';
  }

  tituloModal(): string {
    if (this.tipo === 'composicion') {
      return 'Composición de ingredientes';
    }
    if (this.tipo === 'precision') {
      return 'Precisión nutricional';
    }
    return 'Semáforo normativo';
  }

  puedeDescargar(): boolean {
    return puedeDescargarGrafico(this.rol);
  }

  puedeVerCosto(): boolean {
    return puedeVerCostoProduccion(this.rol) && (this.alternativa.mostrarCosto ?? false);
  }

  esNutricionista(): boolean {
    return esNutricionistaRol(this.rol);
  }

  filasComposicion(): Array<{
    nombre: string;
    grupo: string;
    porcentaje: number;
    costoProporcional: number | null;
  }> {
    const costoKg = Number(this.alternativa.costoEstimadoKg ?? 0);
    return (this.alternativa.ingredientes || [])
      .map((ing) => {
        const pct = Number(ing.porcentaje ?? 0);
        return {
          nombre: ing.nombre || '—',
          grupo: nombreGrupoAlimento(ing.categoria),
          porcentaje: pct,
          costoProporcional: this.puedeVerCosto() ? (pct / 100) * costoKg : null,
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }

  filasPrecision(): Array<{
    clave: string;
    etiqueta: string;
    objetivo: number;
    logrado: number;
    desviacion: number;
    clase: string;
    pctTexto: string;
  }> {
    const perfil = this.alternativa.perfilNutricional || {};
    return nutrientesPrecisionCompletos(perfil).map((clave) => {
      const fila = perfil[clave];
      const objetivo = fila?.objetivo ?? 0;
      const logrado = fila?.logrado ?? 0;
      const desviacion = fila?.desviacion ?? logrado - objetivo;
      return {
        clave,
        etiqueta: etiquetaNutrienteFormulacion(clave),
        objetivo,
        logrado,
        desviacion,
        clase: claseDesviacionPorcentual(objetivo, logrado),
        pctTexto: porcentajeDesviacion(objetivo, logrado),
      };
    });
  }

  filasSemaforoGrafico(): Array<{
    clave: string;
    etiqueta: string;
    logrado: number;
    umbralLey: number;
    limiteCodex: number | null;
    color: string;
    unidad: string;
  }> {
    const perfil = this.alternativa.perfilNutricional || {};
    const detalle = this.alternativa.semaforoDetalle || {};
    const codex = this.mapaCodex();
    return this.clavesSemaforo.map((clave) => {
      const meta = detalle[clave] as Record<string, unknown> | undefined;
      const etiqueta = meta?.['etiqueta']
        ? String(meta['etiqueta'])
        : etiquetaNutrienteFormulacion(clave);
      const umbral = Number(meta?.['umbral'] ?? 0);
      const logrado = Number(perfil[clave]?.logrado ?? meta?.['valor'] ?? 0);
      const color = this.alternativa.semaforo?.[clave];
      return {
        clave,
        etiqueta,
        logrado,
        umbralLey: umbral,
        limiteCodex: codex.get(clave) ?? null,
        color: color || 'VERDE',
        unidad: this.unidadNutriente(clave),
      };
    });
  }

  filasCodex() {
    return this.alternativa.semaforoExtendido?.verificacionCodex ?? [];
  }

  filasLey() {
    return this.alternativa.semaforoExtendido?.verificacionLey30021 ?? [];
  }

  textoTooltipSemaforo(clave: string): string {
    if (this.esNutricionista()) {
      const det = this.alternativa.semaforoDetalle?.[clave] as Record<string, unknown> | undefined;
      if (det) {
        return `Valor: ${det['valor'] ?? '—'} · Umbral Ley: ${det['umbral'] ?? '—'} · ${det['referencia'] ?? 'Ley N° 30021'}`;
      }
    }
    return 'Detalle normativo disponible en Plan Nutricionista';
  }

  valorLogradoSemaforo(clave: string): string {
    const val = this.alternativa.perfilNutricional?.[clave]?.logrado;
    return val != null ? String(val) : '—';
  }

  colorClaseSemaforo(color?: string): string {
    if (color === 'ROJO') {
      return 'bg-red-500';
    }
    if (color === 'AMARILLO') {
      return 'bg-amber-400';
    }
    return 'bg-green-500';
  }

  alternarPanelNormativo(): void {
    if (!this.esNutricionista()) {
      return;
    }
    this.panelNormativoExtendido = !this.panelNormativoExtendido;
  }

  descargarJpg(): void {
    if (!this.puedeDescargar()) {
      return;
    }
    let dataUrl: string | undefined;
    if (this.tipo === 'semaforo') {
      const primero = this.chartsSemaforo[0];
      dataUrl = primero?.toBase64Image('image/jpeg', 0.92);
    } else {
      dataUrl = this.chartPrincipal?.toBase64Image('image/jpeg', 0.92);
    }
    if (!dataUrl) {
      return;
    }
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = `${this.tipo}-receta-${this.alternativa.id}.jpg`;
    enlace.click();
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  private mapaCodex(): Map<string, number> {
    const mapa = new Map<string, number>();
    for (const fila of this.filasCodex()) {
      mapa.set(fila.nutriente, fila.limiteCodex);
    }
    return mapa;
  }

  private unidadNutriente(clave: string): string {
    if (clave.includes('_mg')) {
      return 'mg';
    }
    if (clave.includes('_kcal')) {
      return 'kcal';
    }
    if (clave.includes('_g')) {
      return 'g';
    }
    return '';
  }

  private renderizar(): void {
    if (!this.visible) {
      return;
    }
    setTimeout(() => {
      this.destruirCharts();
      if (this.tipo === 'composicion') {
        this.renderComposicion();
      } else if (this.tipo === 'precision') {
        this.renderPrecision();
      } else {
        this.renderSemaforo();
      }
    }, 50);
  }

  private renderComposicion(): void {
    const canvas = this.canvasPrincipal?.nativeElement;
    if (!canvas) {
      return;
    }
    const items = (this.alternativa.ingredientes || []).map((i) => ({
      nombre: i.nombre || '—',
      pct: Number(i.porcentaje || 0),
    }));
    this.chartPrincipal = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.nombre),
        datasets: [
          {
            data: items.map((i) => i.pct),
            backgroundColor: paletaIngredientes().slice(0, items.length),
            borderWidth: coloresChartOscuro() ? 0 : 1,
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        plugins: {
          ...opcionesBaseChart().plugins,
          legend: {
            position: 'right',
            labels: { color: coloresChartOscuro() ? '#e2e8f0' : '#374151', boxWidth: 12 },
          },
        },
      },
    });
  }

  private renderPrecision(): void {
    const canvas = this.canvasPrincipal?.nativeElement;
    if (!canvas) {
      return;
    }
    const perfil = this.alternativa.perfilNutricional || {};
    const claves = nutrientesPrecisionCompletos(perfil);
    const etiquetas = claves.map((k) => etiquetaNutrienteFormulacion(k));
    const objetivos = claves.map((k) => perfil[k]?.objetivo ?? 0);
    const logrados = claves.map((k) => perfil[k]?.logrado ?? 0);
    this.chartPrincipal = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Objetivo',
            data: objetivos,
            backgroundColor: coloresChartOscuro()
              ? 'rgba(100, 116, 139, 0.7)'
              : 'rgba(156, 163, 175, 0.8)',
          },
          {
            label: 'Logrado',
            data: logrados,
            backgroundColor: coloresChartOscuro()
              ? 'rgba(34, 197, 94, 0.75)'
              : 'rgba(40, 167, 69, 0.85)',
          },
        ],
      },
      options: {
        ...opcionesBaseChart(),
        scales: {
          x: {
            ...(opcionesBaseChart().scales?.['x'] ?? {}),
            ticks: { maxRotation: 55, minRotation: 45, font: { size: 9 } },
          },
          y: { ...(opcionesBaseChart().scales?.['y'] ?? {}), beginAtZero: true },
        },
      },
    });
  }

  private renderSemaforo(): void {
      for (const c of this.chartsSemaforo) {
      destruirChart(c);
    }
    this.chartsSemaforo = [];
    const filas = this.filasSemaforoGrafico();
    const elementos = this.canvasesSemaforo?.toArray() ?? [];
    filas.forEach((fila, idx) => {
      const canvas = elementos[idx]?.nativeElement;
      if (!canvas) {
        return;
      }
      const maxEscala = Math.max(
        fila.logrado * 1.15,
        fila.umbralLey * 1.15,
        (fila.limiteCodex ?? 0) * 1.15,
        1,
      );
      const colorBarra =
        fila.color === 'ROJO'
          ? coloresChartOscuro()
            ? '#ef4444'
            : '#dc3545'
          : fila.color === 'AMARILLO'
            ? coloresChartOscuro()
              ? '#fbbf24'
              : '#d48806'
            : coloresChartOscuro()
              ? '#22c55e'
              : '#28a745';

      const chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: [fila.etiqueta],
          datasets: [
            {
              label: 'Valor logrado',
              data: [fila.logrado],
              backgroundColor: colorBarra,
              borderRadius: 4,
            },
            ...(fila.umbralLey > 0
              ? [
                  {
                    label: 'Umbral Ley N° 30021',
                    data: [fila.umbralLey],
                    type: 'line' as const,
                    borderColor: coloresChartOscuro() ? '#f59e0b' : '#d48806',
                    backgroundColor: 'transparent',
                    borderDash: [6, 4],
                    pointRadius: 5,
                    borderWidth: 2,
                  },
                ]
              : []),
            ...(this.esNutricionista() && fila.limiteCodex != null && fila.limiteCodex > 0
              ? [
                  {
                    label: 'Límite Codex',
                    data: [fila.limiteCodex],
                    type: 'line' as const,
                    borderColor: coloresChartOscuro() ? '#38bdf8' : '#0056B3',
                    backgroundColor: 'transparent',
                    borderDash: [2, 2],
                    pointRadius: 5,
                    borderWidth: 2,
                  },
                ]
              : []),
          ],
        },
        options: {
          ...opcionesBaseChart(),
          indexAxis: 'y',
          plugins: {
            ...opcionesBaseChart().plugins,
            legend: { display: idx === 0 },
          },
          scales: {
            x: {
              ...(opcionesBaseChart().scales?.['x'] ?? {}),
              min: 0,
              max: maxEscala,
              title: {
                display: true,
                text: fila.unidad,
                color: coloresChartOscuro() ? '#94a3b8' : '#6b7280',
              },
            },
            y: { ...(opcionesBaseChart().scales?.['y'] ?? {}) },
          },
        },
      });
      this.chartsSemaforo.push(chart);
    });
  }

  private destruirCharts(): void {
    destruirChart(this.chartPrincipal);
    this.chartPrincipal = undefined;
    for (const c of this.chartsSemaforo) {
      destruirChart(c);
    }
    this.chartsSemaforo = [];
  }
}
