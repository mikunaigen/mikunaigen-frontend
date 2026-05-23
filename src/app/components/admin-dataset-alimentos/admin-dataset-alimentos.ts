import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import {
  AlimentoDatasetAdminService,
  AlimentoDatasetRow,
  FiltrosMetaDto,
} from '../../services/alimento-dataset-admin.service';
import { extraerLineasDatosCsv, leerArchivoCsvComoTexto } from '../../utils/csv-minsa-dataset';
import { firstValueFrom, timer, switchMap, takeWhile, timeout, catchError, of } from 'rxjs';

type CampoNum = { key: keyof AlimentoDatasetRow; label: string };

@Component({
  selector: 'app-admin-dataset-alimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-dataset-alimentos.component.html',
})
export class AdminDatasetAlimentosComponent implements OnInit {
  @ViewChild('csvReimport') csvReimport?: ElementRef<HTMLInputElement>;

  private readonly datasetService = inject(AlimentoDatasetAdminService);

  readonly columnasCsv =
    'codigo,grupo,nombre_alimento,energia_kcal,agua_g,proteinas_g,grasa_total_g,carbohidratos_totales_g,carbohidratos_disponibles_g,fibra_dietaria_g,cenizas_g,calcio_mg,fosforo_mg,zinc_mg,hierro_mg,beta_caroteno_ug,vitamina_a_ug,tiamina_mg,riboflavina_mg,niacina_mg,vitamina_c_mg,acido_folico_ug,sodio_mg,potasio_mg,costo_kg_soles,enero,febrero,marzo,abril,mayo,junio,julio,agosto,septiembre,octubre,noviembre,diciembre';

  readonly camposNumericos: CampoNum[] = [
    { key: 'energia_kcal', label: 'Energía kcal' },
    { key: 'agua_g', label: 'Agua g' },
    { key: 'proteinas_g', label: 'Proteínas g' },
    { key: 'grasa_total_g', label: 'Grasa g' },
    { key: 'carbohidratos_totales_g', label: 'CHO totales g' },
    { key: 'carbohidratos_disponibles_g', label: 'CHO disp. g' },
    { key: 'fibra_g', label: 'Fibra g' },
    { key: 'cenizas_g', label: 'Cenizas g' },
    { key: 'calcio_mg', label: 'Calcio mg' },
    { key: 'fosforo_mg', label: 'Fósforo mg' },
    { key: 'zinc_mg', label: 'Zinc mg' },
    { key: 'hierro_mg', label: 'Hierro mg' },
    { key: 'beta_caroteno_ug', label: 'β-caroteno µg' },
    { key: 'vitamina_a_ug', label: 'Vit. A µg' },
    { key: 'tiamina_mg', label: 'Tiamina mg' },
    { key: 'riboflavina_mg', label: 'Riboflavina mg' },
    { key: 'niacina_mg', label: 'Niacina mg' },
    { key: 'vitamina_c_mg', label: 'Vit. C mg' },
    { key: 'acido_folico_ug', label: 'Ác. fólico µg' },
    { key: 'sodio_mg', label: 'Sodio mg' },
    { key: 'potasio_mg', label: 'Potasio mg' },
    { key: 'costo_kg_soles', label: 'Costo S/kg' },
  ];

  readonly tamanosPagina = [20, 50, 100] as const;

  readonly meses = [
    { key: 'enero', label: 'Ene' },
    { key: 'febrero', label: 'Feb' },
    { key: 'marzo', label: 'Mar' },
    { key: 'abril', label: 'Abr' },
    { key: 'mayo', label: 'May' },
    { key: 'junio', label: 'Jun' },
    { key: 'julio', label: 'Jul' },
    { key: 'agosto', label: 'Ago' },
    { key: 'septiembre', label: 'Sep' },
    { key: 'octubre', label: 'Oct' },
    { key: 'noviembre', label: 'Nov' },
    { key: 'diciembre', label: 'Dic' },
  ] as const;

  vacio = signal(true);
  cargando = signal(true);
  guardando = signal(false);
  subiendoCsv = signal(false);
  progresoCsv = signal<{ actual: number; total: number } | null>(null);
  alimentos = signal<AlimentoDatasetRow[]>([]);
  metaFiltros = signal<FiltrosMetaDto | null>(null);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);
  pagina = signal(0);
  tamanoPagina = signal(20);
  totalRegistros = signal(0);
  totalPaginas = signal(0);

  private readonly filasDirty = new Map<string, AlimentoDatasetRow>();

  filtroNombre = '';
  filtroGrupo = '';
  filtroCampo = '';
  filtroRango = 'todos';
  archivoCsv: File | null = null;

  ngOnInit(): void {
    this.cargarEstado();
  }

  cargarEstado(): void {
    this.cargando.set(true);
    this.datasetService.estado().subscribe({
      next: (est) => {
        this.vacio.set(est.vacio);
        this.cargando.set(false);
        if (!est.vacio) {
          this.cargarMetaYTabla();
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudo verificar el dataset.');
      },
    });
  }

  cargarMetaYTabla(): void {
    this.datasetService.filtros().subscribe({
      next: (m) => this.metaFiltros.set(m),
      error: () => {},
    });
    this.cargarTabla();
  }

  cargarTabla(): void {
    this.cargando.set(true);
    this.datasetService
      .listar({
        nombre: this.filtroNombre,
        grupo: this.filtroGrupo,
        campoNutricional: this.filtroCampo || undefined,
        rangoFiltro: this.filtroCampo ? this.filtroRango : undefined,
        page: this.pagina(),
        size: this.tamanoPagina(),
      })
      .subscribe({
        next: (res) => {
          this.cargando.set(false);
          this.totalRegistros.set(res.total);
          this.totalPaginas.set(res.totalPages);
          this.pagina.set(res.page);
          this.tamanoPagina.set(res.size);
          this.alimentos.set(res.alimentos.map((a) => this.fusionarFilaConCache(a)));
        },
        error: (err) => {
          this.cargando.set(false);
          this.mostrarError(err?.error?.message || 'No se pudo cargar el dataset.');
        },
      });
  }

  cantidadCambiosPendientes(): number {
    return this.filasDirty.size;
  }

  cambiarTamanoPagina(tamano: number): void {
    const permitido = this.tamanosPagina.includes(tamano as (typeof this.tamanosPagina)[number])
      ? tamano
      : 20;
    this.tamanoPagina.set(permitido);
    this.pagina.set(0);
    this.cargarTabla();
  }

  irPaginaAnterior(): void {
    if (this.pagina() <= 0) {
      return;
    }
    this.pagina.update((p) => p - 1);
    this.cargarTabla();
  }

  irPaginaSiguiente(): void {
    if (this.pagina() >= this.totalPaginas() - 1) {
      return;
    }
    this.pagina.update((p) => p + 1);
    this.cargarTabla();
  }

  onArchivoCsv(event: Event): boolean {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.archivoCsv = null;
      return false;
    }
    if (!this.esCsvValido(file)) {
      this.archivoCsv = null;
      input.value = '';
      this.mostrarAlertaCsvInvalido();
      return false;
    }
    this.archivoCsv = file;
    return true;
  }

  importarCsv(): void {
    void this.ejecutarImportacionCsv();
  }

  porcentajeProgresoCsv(): number {
    const p = this.progresoCsv();
    if (!p || p.total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((p.actual / p.total) * 100));
  }

  private async ejecutarImportacionCsv(): Promise<void> {
    const archivo = this.archivoCsv;
    if (!archivo) {
      this.mostrarError('Selecciona un archivo CSV.');
      return;
    }
    if (!this.esCsvValido(archivo)) {
      this.archivoCsv = null;
      this.mostrarAlertaCsvInvalido();
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.mostrarError('El archivo no puede superar 5 MB.');
      return;
    }
    this.subiendoCsv.set(true);
    this.progresoCsv.set({ actual: 0, total: 0 });
    try {
      const texto = await leerArchivoCsvComoTexto(archivo);
      const lineasDatos = extraerLineasDatosCsv(texto);
      const total = lineasDatos.length;
      if (total === 0) {
        this.mostrarError('El CSV no contiene filas de datos.');
        return;
      }
      this.progresoCsv.set({ actual: 0, total });
      const job = await firstValueFrom(this.datasetService.iniciarImportacionCsv(lineasDatos));
      const resultado = await this.esperarFinImportacion(job.jobId, total);
      this.progresoCsv.set({ actual: total, total });
      this.archivoCsv = null;
      this.vacio.set(false);
      this.mostrarOk(
        'Importación completada',
        `Se importaron ${resultado.registrosProcesados} fila(s). Total en PostgreSQL: ${resultado.totalBd}.`,
      );
      this.datasetService.cerrarImportacionCsv(job.jobId).subscribe({ error: () => {} });
      this.cargarMetaYTabla();
    } catch (err: unknown) {
      const httpErr = err as { error?: { message?: string; error?: string }; message?: string };
      const detalle = httpErr?.error?.message ?? httpErr?.error?.error ?? httpErr?.message;
      this.mostrarError(detalle || 'Error al importar el CSV.');
    } finally {
      this.subiendoCsv.set(false);
      this.progresoCsv.set(null);
    }
  }

  aplicarFiltros(): void {
    this.pagina.set(0);
    this.cargarTabla();
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroGrupo = '';
    this.filtroCampo = '';
    this.filtroRango = 'todos';
    this.pagina.set(0);
    this.cargarTabla();
  }

  seleccionarRango(id: string): void {
    this.filtroRango = id;
    if (this.filtroCampo) {
      this.cargarTabla();
    }
  }

  marcarDirty(row: AlimentoDatasetRow): void {
    row._dirty = true;
    this.filasDirty.set(this.claveFila(row), row);
  }

  mesActivo(row: AlimentoDatasetRow, mes: string): boolean {
    return !!(row as Record<string, unknown>)[mes];
  }

  toggleMes(row: AlimentoDatasetRow, mes: string): void {
    const actual = this.mesActivo(row, mes);
    (row as Record<string, unknown>)[mes] = !actual;
    this.marcarDirty(row);
  }

  onNumChange(row: AlimentoDatasetRow, key: keyof AlimentoDatasetRow, val: string | number): void {
    const n = val === '' || val === null ? null : Number(val);
    (row as Record<string, unknown>)[key as string] = n;
    this.marcarDirty(row);
  }

  abrirReimportarCsv(): void {
    this.csvReimport?.nativeElement.click();
  }

  agregarAlimento(): void {
    const nuevo: AlimentoDatasetRow = {
      _clave: `nuevo-${Date.now()}`,
      _dirty: true,
      codigo_minsa: '',
      nombre: '',
      categoria: this.metaFiltros()?.categoriasPermitidas?.[0] || 'Verduras',
      energia_kcal: 0,
      costo_kg_soles: 0,
    };
    this.meses.forEach((m) => {
      (nuevo as Record<string, unknown>)[m.key] = false;
    });
    this.filasDirty.set(this.claveFila(nuevo), nuevo);
    this.alimentos.update((list) => [nuevo, ...list]);
  }

  guardarCambios(): void {
    const pendientes = Array.from(this.filasDirty.values());
    if (pendientes.length === 0) {
      this.mostrarError('No hay cambios pendientes por guardar.');
      return;
    }
    for (const fila of pendientes) {
      const err = this.validarFila(fila);
      if (err) {
        this.mostrarError(`${fila.nombre || 'Fila nueva'}: ${err}`);
        return;
      }
    }
    this.guardando.set(true);
    this.datasetService.guardarLote(pendientes).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.filasDirty.clear();
        this.mostrarOk('Cambios guardados', res.message);
        this.cargarTabla();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudieron guardar los cambios.');
      },
    });
  }

  validarFila(row: AlimentoDatasetRow): string | null {
    if (!row.nombre?.trim()) {
      return 'El nombre es obligatorio.';
    }
    if (!row.categoria?.trim()) {
      return 'El grupo es obligatorio.';
    }
    for (const c of this.camposNumericos) {
      const v = row[c.key];
      if (v === null || v === undefined || v === ('' as unknown)) {
        if (c.key === 'energia_kcal' || c.key === 'costo_kg_soles') {
          return `${c.label} es obligatorio.`;
        }
        continue;
      }
      const n = Number(v);
      if (Number.isNaN(n) || n < 0) {
        return `${c.label} debe ser numérico y no negativo.`;
      }
    }
    return null;
  }

  trackFila(_: number, row: AlimentoDatasetRow): string | number {
    return row._clave ?? row.id ?? row.nombre;
  }

  etiquetaCampo(campo: string): string {
    return this.camposNumericos.find((c) => c.key === campo)?.label ?? campo;
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  private claveFila(row: AlimentoDatasetRow): string {
    if (row.id != null) {
      return `id-${row.id}`;
    }
    if (row._clave) {
      return row._clave;
    }
    return `nombre-${row.nombre}`;
  }

  private fusionarFilaConCache(a: AlimentoDatasetRow): AlimentoDatasetRow {
    const norm = this.normalizarFila(a);
    const clave = this.claveFila(norm);
    const enCache = this.filasDirty.get(clave);
    if (enCache) {
      return { ...enCache, _dirty: true };
    }
    return norm;
  }

  private normalizarFila(a: AlimentoDatasetRow): AlimentoDatasetRow {
    const fila = { ...a, _dirty: false };
    if (Array.isArray(fila.meses_disponibilidad) && fila.meses_disponibilidad.length === 1 && Array.isArray(fila.meses_disponibilidad[0])) {
      fila.meses_disponibilidad = fila.meses_disponibilidad[0] as unknown as number[];
    }
    this.meses.forEach((m, idx) => {
      (fila as Record<string, unknown>)[m.key] = fila.meses_disponibilidad?.includes(idx + 1) ?? false;
    });
    return fila;
  }

  private mostrarOk(titulo: string, mensaje: string): void {
    this.modal.set({ tipo: 'ok', titulo, mensaje });
  }

  private mostrarError(mensaje: string): void {
    this.modal.set({ tipo: 'error', titulo: 'Error', mensaje });
  }

  private esperarFinImportacion(
    jobId: string,
    total: number,
  ): Promise<{ registrosProcesados: number; totalBd: number }> {
    return new Promise((resolve, reject) => {
      const sub = timer(0, 1000)
        .pipe(
          switchMap(() =>
            this.datasetService.progresoImportacionCsv(jobId).pipe(
              catchError((err) => {
                reject(err);
                return of(null);
              }),
            ),
          ),
          takeWhile((p) => p !== null && p.estado === 'procesando', true),
          timeout(600_000),
        )
        .subscribe({
          next: (p) => {
            if (!p) {
              return;
            }
            const totalCsv = p.total > 0 ? p.total : total;
            this.progresoCsv.set({
              actual: Math.min(p.actual, totalCsv),
              total: totalCsv,
            });
            if (p.estado === 'completado') {
              this.progresoCsv.set({ actual: totalCsv, total: totalCsv });
              sub.unsubscribe();
              resolve({
                registrosProcesados: p.registrosProcesados > 0 ? p.registrosProcesados : totalCsv,
                totalBd: p.totalBd ?? p.registrosEnBd ?? 0,
              });
            } else if (p.estado === 'error') {
              sub.unsubscribe();
              reject(new Error(p.mensaje || 'Error al importar el CSV.'));
            }
          },
          error: (err) => {
            sub.unsubscribe();
            reject(err);
          },
        });
    });
  }

  private mostrarAlertaCsvInvalido(): void {
    this.modal.set({
      tipo: 'error',
      titulo: 'Archivo no permitido',
      mensaje:
        'Solo se permiten archivos CSV (.csv). Elige un archivo con extensión .csv y las columnas del formato MINSA.',
    });
  }

  private esCsvValido(file: File): boolean {
    const nombre = file.name.trim().toLowerCase();
    if (!nombre.endsWith('.csv')) {
      return false;
    }
    const tipo = (file.type || '').toLowerCase();
    if (!tipo) {
      return true;
    }
    const permitidos = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);
    return permitidos.has(tipo);
  }
}
