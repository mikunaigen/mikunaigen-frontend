import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  QueryList,
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
  BloqueExportacionGrafico,
  chartInstanciaAJpeg,
  coloresChartOscuro,
  combinarCanvasesAJpeg,
  destruirChart,
  opcionesBaseChart,
  paletaIngredientes,
} from '../../shared/chart-tema.util';

Chart.register(...registerables);


const DEPURAR_GRAFICO_MODAL =
  typeof ngDevMode !== 'undefined' && ngDevMode
    ? true
    : typeof localStorage !== 'undefined' && localStorage.getItem('debugGraficoModal') === '1';

type FilaComposicion = {
  nombre: string;
  grupo: string;
  porcentaje: number;
  costoProporcional: number | null;
};

type FilaPrecision = {
  clave: string;
  etiqueta: string;
  objetivo: number;
  logrado: number;
  desviacion: number;
  clase: string;
  pctTexto: string;
};

type FilaSemaforoGrafico = {
  clave: string;
  etiqueta: string;
  logrado: number;
  umbralLey: number;
  limiteCodex: number | null;
  color: string;
  unidad: string;
};

@Component({
  selector: 'app-detalle-grafico-receta-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './detalle-grafico-receta-modal.component.html',
})
export class DetalleGraficoRecetaModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) alternativa!: AlternativaRecetaDto;
  @Input({ required: true }) tipo!: TipoGraficoExpandido;
  @Input() visible = false;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('canvasPrincipal') canvasPrincipal?: ElementRef<HTMLCanvasElement>;
  @ViewChildren('canvasSemaforoItem') canvasesSemaforo!: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly theme = inject(ThemeService);
  private readonly zone = inject(NgZone);
  private subTema?: Subscription;
  private chartPrincipal?: Chart;
  private chartsSemaforo: Chart[] = [];
  private idRenderPendiente = 0;
  private semaforoYaRenderizado = false;

  panelNormativoExtendido = false;
  tituloModalTexto = '';
  filasComposicionCache: FilaComposicion[] = [];
  filasPrecisionCache: FilaPrecision[] = [];
  filasSemaforoCache: FilaSemaforoGrafico[] = [];

  readonly clavesSemaforo = ['sodio_mg', 'grasa_total_g', 'carbohidratos_disponibles_g'];

  ngOnInit(): void {
    if (this.visible) {
      this.depurar('init con visible');
      this.actualizarCaches();
      this.bloquearScrollDocumento(true);
      this.programarRender();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      this.depurar('visible cambió', {
        actual: changes['visible'].currentValue,
        tipo: this.tipo,
      });
      if (this.visible) {
        this.panelNormativoExtendido = false;
        this.semaforoYaRenderizado = false;
        this.actualizarCaches();
        this.bloquearScrollDocumento(true);
        this.programarRender();
      } else {
        this.bloquearScrollDocumento(false);
        this.cancelarRenderPendiente();
        this.destruirCharts();
      }
    } else if (this.visible && (changes['tipo'] || changes['alternativa'])) {
      this.actualizarCaches();
      this.semaforoYaRenderizado = false;
      this.programarRender();
    }
  }

  ngOnDestroy(): void {
    this.depurar('destroy modal');
    this.subTema?.unsubscribe();
    this.bloquearScrollDocumento(false);
    this.cancelarRenderPendiente();
    this.destruirCharts();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.depurar('cerrar por Escape');
      this.onCerrar();
    }
  }

  get rol(): string {
    return this.alternativa.rol || 'estudiante';
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
      const bloques: BloqueExportacionGrafico[] = [];
      for (let idx = 0; idx < this.filasSemaforoCache.length; idx++) {
        const canvas = this.chartsSemaforo[idx]?.canvas;
        if (!canvas) {
          continue;
        }
        bloques.push({
          canvas,
          titulo: this.tituloExportacionSemaforo(this.filasSemaforoCache[idx]),
        });
      }
      dataUrl = combinarCanvasesAJpeg(bloques, { tituloGeneral: this.tituloModalTexto });
    } else {
      dataUrl = chartInstanciaAJpeg(this.chartPrincipal);
    }
    if (!dataUrl) {
      return;
    }
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = `${this.tipo}-receta-${this.alternativa.id}.jpg`;
    enlace.click();
  }

  private tituloExportacionSemaforo(fila: FilaSemaforoGrafico): string {
    const unidad = fila.unidad?.trim();
    if (!unidad) {
      return fila.etiqueta;
    }
    if (fila.etiqueta.includes(`(${unidad})`) || fila.etiqueta.endsWith(` ${unidad}`)) {
      return fila.etiqueta;
    }
    return `${fila.etiqueta} (${unidad})`;
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  trackFilaComposicion(_: number, fila: FilaComposicion): string {
    return fila.nombre;
  }

  trackFilaPrecision(_: number, fila: FilaPrecision): string {
    return fila.clave;
  }

  private actualizarCaches(): void {
    if (this.tipo === 'composicion') {
      this.tituloModalTexto = 'Composición de ingredientes';
    } else if (this.tipo === 'precision') {
      this.tituloModalTexto = 'Precisión nutricional';
    } else {
      this.tituloModalTexto = 'Semáforo normativo';
    }

    const costoKg = Number(this.alternativa.costoEstimadoKg ?? 0);
    const verCosto = this.puedeVerCosto();
    this.filasComposicionCache = (this.alternativa.ingredientes || [])
      .map((ing) => {
        const pct = Number(ing.porcentaje ?? 0);
        return {
          nombre: ing.nombre || '—',
          grupo: nombreGrupoAlimento(ing.categoria),
          porcentaje: pct,
          costoProporcional: verCosto ? (pct / 100) * costoKg : null,
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);

    const perfil = this.alternativa.perfilNutricional || {};
    this.filasPrecisionCache = nutrientesPrecisionCompletos(perfil).map((clave) => {
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

    const detalle = this.alternativa.semaforoDetalle || {};
    const codex = new Map<string, number>();
    for (const fila of this.filasCodex()) {
      codex.set(fila.nutriente, fila.limiteCodex);
    }
    this.filasSemaforoCache = this.clavesSemaforo.map((clave) => {
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

  private programarRender(): void {
    const id = ++this.idRenderPendiente;
    this.depurar('programar render', { id, tipo: this.tipo });
    this.semaforoYaRenderizado = false;

    if (!this.subTema) {
      this.subTema = this.theme.themeChanged.subscribe(() => {
        if (this.visible) {
          this.programarRender();
        }
      });
    }

    this.zone.runOutsideAngular(() => {
      window.setTimeout(() => {
        if (!this.visible || id !== this.idRenderPendiente) {
          this.depurar('render cancelado o obsoleto', { id, actual: this.idRenderPendiente });
          return;
        }
        this.zone.run(() => {
          this.ejecutarRender(id);
        });
      }, 120);
    });
  }

  private cancelarRenderPendiente(): void {
    this.idRenderPendiente++;
  }

  private ejecutarRender(id: number): void {
    if (!this.visible || id !== this.idRenderPendiente) {
      return;
    }
    this.depurar('ejecutar render inicio', { id, tipo: this.tipo });
    this.destruirCharts();

    try {
      if (this.tipo === 'composicion') {
        this.renderComposicion();
      } else if (this.tipo === 'precision') {
        this.renderPrecision();
      } else {
        this.renderSemaforo(id);
      }
      this.depurar('ejecutar render fin', { id, tipo: this.tipo });
    } catch (error) {
      console.error('[GraficoModal] error al renderizar', error);
    }
  }

  private opcionesSinAnimacion(): ReturnType<typeof opcionesBaseChart> {
    return {
      ...opcionesBaseChart(),
      animation: false as const,
      transitions: {
        active: { animation: { duration: 0 } },
      },
    };
  }

  private renderComposicion(): void {
    const canvas = this.canvasPrincipal?.nativeElement;
    if (!canvas) {
      this.depurar('canvas composición no encontrado');
      return;
    }
    const items = this.filasComposicionCache;
    this.zone.runOutsideAngular(() => {
      this.chartPrincipal = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: items.map((i) => i.nombre),
          datasets: [
            {
              data: items.map((i) => i.porcentaje),
              backgroundColor: paletaIngredientes().slice(0, items.length),
              borderWidth: coloresChartOscuro() ? 0 : 1,
            },
          ],
        },
        options: {
          ...this.opcionesSinAnimacion(),
          plugins: {
            ...this.opcionesSinAnimacion().plugins,
            legend: {
              position: 'right',
              labels: { color: coloresChartOscuro() ? '#e2e8f0' : '#374151', boxWidth: 12 },
            },
          },
        },
      });
    });
  }

  private renderPrecision(): void {
    const canvas = this.canvasPrincipal?.nativeElement;
    if (!canvas) {
      this.depurar('canvas precisión no encontrado');
      return;
    }
    const perfil = this.alternativa.perfilNutricional || {};
    const claves = this.filasPrecisionCache.map((f) => f.clave);
    const etiquetas = this.filasPrecisionCache.map((f) => f.etiqueta);
    const objetivos = claves.map((k) => perfil[k]?.objetivo ?? 0);
    const logrados = claves.map((k) => perfil[k]?.logrado ?? 0);
    const base = this.opcionesSinAnimacion();

    this.zone.runOutsideAngular(() => {
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
          ...base,
          scales: {
            x: {
              ...(base.scales?.['x'] ?? {}),
              ticks: { maxRotation: 55, minRotation: 45, font: { size: 9 } },
            },
            y: { ...(base.scales?.['y'] ?? {}), beginAtZero: true },
          },
        },
      });
    });
  }

  private renderSemaforo(id: number): void {
    if (this.semaforoYaRenderizado && id !== this.idRenderPendiente) {
      return;
    }
    const filas = this.filasSemaforoCache;
    const elementos = this.canvasesSemaforo?.toArray() ?? [];
    if (elementos.length < filas.length) {
      this.depurar('canvases semáforo aún no listos, reintento', {
        esperados: filas.length,
        encontrados: elementos.length,
      });
      if (id === this.idRenderPendiente) {
        this.zone.runOutsideAngular(() => {
          window.setTimeout(() => {
            this.zone.run(() => {
              if (this.visible && id === this.idRenderPendiente) {
                this.renderSemaforo(id);
              }
            });
          }, 80);
        });
      }
      return;
    }

    this.semaforoYaRenderizado = true;
    for (const c of this.chartsSemaforo) {
      destruirChart(c);
    }
    this.chartsSemaforo = [];

    const base = this.opcionesSinAnimacion();
    this.zone.runOutsideAngular(() => {
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
            ...base,
            indexAxis: 'y',
            plugins: {
              ...base.plugins,
              legend: { display: idx === 0 },
            },
            scales: {
              x: {
                ...(base.scales?.['x'] ?? {}),
                min: 0,
                max: maxEscala,
                title: {
                  display: true,
                  text: fila.unidad,
                  color: coloresChartOscuro() ? '#94a3b8' : '#6b7280',
                },
              },
              y: { ...(base.scales?.['y'] ?? {}) },
            },
          },
        });
        this.chartsSemaforo.push(chart);
      });
    });
  }

  private destruirCharts(): void {
    destruirChart(this.chartPrincipal);
    this.chartPrincipal = undefined;
    for (const c of this.chartsSemaforo) {
      destruirChart(c);
    }
    this.chartsSemaforo = [];
    this.semaforoYaRenderizado = false;
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

  private bloquearScrollDocumento(bloquear: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = bloquear ? 'hidden' : '';
  }

  private depurar(mensaje: string, datos?: unknown): void {
    if (!DEPURAR_GRAFICO_MODAL) {
      return;
    }
    if (datos !== undefined) {
      console.log(`[GraficoModal] ${mensaje}`, datos);
    } else {
      console.log(`[GraficoModal] ${mensaje}`);
    }
  }
}
