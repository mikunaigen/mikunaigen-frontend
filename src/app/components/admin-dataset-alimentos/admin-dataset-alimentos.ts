import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import {
  AlimentoDatasetAdminService,
  AlimentoDatasetRow,
  FiltrosMetaDto,
} from '../../services/alimento-dataset-admin.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { extraerLineasDatosCsv, leerArchivoCsvComoTexto } from '../../utils/csv-minsa-dataset';
import { firstValueFrom, timer, switchMap, takeWhile, timeout, catchError, of } from 'rxjs';

type CampoNum = { key: keyof AlimentoDatasetRow; label: string };

type ModalDataset =
  | { tipo: 'ok' | 'error'; titulo: string; mensaje: string }
  | { tipo: 'pendientes'; cambios: string[] }
  | null;

@Component({
  selector: 'app-admin-dataset-alimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-dataset-alimentos.component.html',
})
export class AdminDatasetAlimentosComponent implements OnInit {
  @ViewChild('csvReimport') csvReimport?: ElementRef<HTMLInputElement>;

  private readonly datasetService = inject(AlimentoDatasetAdminService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

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
  modal = signal<ModalDataset>(null);
  pagina = signal(0);
  tamanoPagina = signal(20);
  totalRegistros = signal(0);
  totalPaginas = signal(0);

  private readonly filasDirty = new Map<string, AlimentoDatasetRow>();
  private readonly filasOriginales = new Map<string, AlimentoDatasetRow>();
  private accionPendiente: (() => void) | null = null;

  filtroNombre = '';
  filtroGrupo = '';
  filtroCampo = '';
  filtroRango = 'todos';
  archivoCsv: File | null = null;

  ngOnInit(): void {
    this.cargarEstado();
  }

  interceptarCerrarSesion = (): boolean => {
    if (this.filasDirty.size === 0) {
      return true;
    }
    this.confirmarSiHayCambios(() => this.ejecutarCerrarSesion());
    return false;
  };

  solicitarIrPanel(event: Event): void {
    event.preventDefault();
    this.confirmarSiHayCambios(() => void this.router.navigate(['/gestion-administrador']));
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

  esModalPendientes(): boolean {
    return this.modal()?.tipo === 'pendientes';
  }

  cambiarTamanoPagina(tamano: number): void {
    const permitido = this.tamanosPagina.includes(tamano as (typeof this.tamanosPagina)[number])
      ? tamano
      : 20;
    this.confirmarSiHayCambios(() => {
      this.tamanoPagina.set(permitido);
      this.pagina.set(0);
      this.cargarTabla();
    });
  }

  irPaginaAnterior(): void {
    if (this.pagina() <= 0) {
      return;
    }
    this.confirmarSiHayCambios(() => {
      this.pagina.update((p) => p - 1);
      this.cargarTabla();
    });
  }

  irPaginaSiguiente(): void {
    if (this.pagina() >= this.totalPaginas() - 1) {
      return;
    }
    this.confirmarSiHayCambios(() => {
      this.pagina.update((p) => p + 1);
      this.cargarTabla();
    });
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
    this.confirmarSiHayCambios(() => void this.ejecutarImportacionCsv());
  }

  porcentajeProgresoCsv(): number {
    const p = this.progresoCsv();
    if (!p || p.total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((p.actual / p.total) * 100));
  }

  aplicarFiltros(): void {
    this.confirmarSiHayCambios(() => {
      this.pagina.set(0);
      this.cargarTabla();
    });
  }

  limpiarFiltros(): void {
    this.confirmarSiHayCambios(() => {
      this.filtroNombre = '';
      this.filtroGrupo = '';
      this.filtroCampo = '';
      this.filtroRango = 'todos';
      this.pagina.set(0);
      this.cargarTabla();
    });
  }

  seleccionarRango(id: string): void {
    this.filtroRango = id;
    if (this.filtroCampo) {
      this.confirmarSiHayCambios(() => this.cargarTabla());
    }
  }

  marcarDirty(row: AlimentoDatasetRow): void {
    this.actualizarEstadoFila(row);
  }

  mesActivo(row: AlimentoDatasetRow, mes: string): boolean {
    return !!(row as Record<string, unknown>)[mes];
  }

  toggleMes(row: AlimentoDatasetRow, mes: string): void {
    const actual = this.mesActivo(row, mes);
    (row as Record<string, unknown>)[mes] = !actual;
    this.actualizarEstadoFila(row);
  }

  onNumChange(row: AlimentoDatasetRow, key: keyof AlimentoDatasetRow, val: string | number): void {
    const n = val === '' || val === null ? null : Number(val);
    (row as Record<string, unknown>)[key as string] = n;
    this.actualizarEstadoFila(row);
  }

  abrirReimportarCsv(): void {
    this.confirmarSiHayCambios(() => this.csvReimport?.nativeElement.click());
  }

  onReimportarArchivo(event: Event): boolean {
    if (!this.onArchivoCsv(event)) {
      return false;
    }
    void this.ejecutarImportacionCsv();
    return true;
  }

  agregarAlimento(): void {
    const nuevo: AlimentoDatasetRow = {
      _clave: `nuevo-${Date.now()}`,
      _dirty: false,
      codigo_minsa: '',
      nombre: '',
      categoria: this.metaFiltros()?.categoriasPermitidas?.[0] || 'Verduras',
      energia_kcal: 0,
      costo_kg_soles: 0,
    };
    this.meses.forEach((m) => {
      (nuevo as Record<string, unknown>)[m.key] = false;
    });
    this.registrarOriginal(nuevo);
    this.actualizarEstadoFila(nuevo);
    if (nuevo._dirty) {
      this.alimentos.update((list) => [nuevo, ...list]);
    }
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
        this.mostrarError(`${fila.nombre || 'Fila nueva'}: ${err}`);
        return;
      }
    }
    this.guardando.set(true);
    this.datasetService.guardarLote(pendientes).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.filasDirty.clear();
        if (alContinuar) {
          alContinuar();
        } else {
          this.mostrarOk('Cambios guardados', res.message);
        }
        this.cargarTabla();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudieron guardar los cambios.');
      },
    });
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
    this.alimentos.update((list) =>
      list
        .filter((row) => row.id != null)
        .map((row) => {
          const orig = this.filasOriginales.get(this.claveFila(row));
          if (orig) {
            return { ...this.clonarFilaComparacion(orig), _dirty: false };
          }
          return { ...row, _dirty: false };
        }),
    );
    this.modal.set(null);
    accion?.();
  }

  cancelarModalPendientes(): void {
    this.accionPendiente = null;
    this.modal.set(null);
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
    const m = this.modal();
    if (m?.tipo === 'pendientes') {
      this.cancelarModalPendientes();
      return;
    }
    this.modal.set(null);
  }

  private confirmarSiHayCambios(accion: () => void): void {
    if (this.filasDirty.size === 0) {
      accion();
      return;
    }
    this.accionPendiente = accion;
    this.modal.set({
      tipo: 'pendientes',
      cambios: this.listarResumenCambios(),
    });
  }

  private listarResumenCambios(): string[] {
    return Array.from(this.filasDirty.values()).map((row) => this.resumirCambiosFila(row));
  }

  private ejecutarCerrarSesion(): void {
    this.auth.clearSession();
    this.theme.onLogout();
    void this.router.navigate(['/presentacion']);
  }

  private actualizarEstadoFila(row: AlimentoDatasetRow): void {
    const clave = this.claveFila(row);
    if (!this.filasOriginales.has(clave)) {
      this.registrarOriginal(row);
    }
    const original = this.filasOriginales.get(clave);
    if (original && this.filasIguales(row, original)) {
      row._dirty = false;
      this.filasDirty.delete(clave);
      if (row.id == null && this.esFilaNuevaVacia(row, original)) {
        this.filasOriginales.delete(clave);
        this.alimentos.update((list) => list.filter((r) => this.claveFila(r) !== clave));
        return;
      }
    } else {
      row._dirty = true;
      this.filasDirty.set(clave, row);
    }
    this.sincronizarFilaEnLista(row);
  }

  private sincronizarFilaEnLista(row: AlimentoDatasetRow): void {
    const clave = this.claveFila(row);
    this.alimentos.update((list) =>
      list.map((r) => (this.claveFila(r) === clave ? { ...row } : r)),
    );
  }

  private registrarOriginal(row: AlimentoDatasetRow): void {
    const clave = this.claveFila(row);
    if (!this.filasOriginales.has(clave)) {
      this.filasOriginales.set(clave, this.clonarFilaComparacion(row));
    }
  }

  private esFilaNuevaVacia(row: AlimentoDatasetRow, original: AlimentoDatasetRow): boolean {
    return row.id == null && this.filasIguales(row, original);
  }

  private resumirCambiosFila(row: AlimentoDatasetRow): string {
    const clave = this.claveFila(row);
    const etiqueta = row.nombre?.trim() || row.codigo_minsa?.trim() || 'Alimento sin nombre';
    const original = this.filasOriginales.get(clave);
    if (!original || row.id == null) {
      return `${etiqueta} (nuevo)`;
    }
    const detalles: string[] = [];
    if (this.textoDistinto(row.codigo_minsa, original.codigo_minsa)) {
      detalles.push(`código: ${this.fmt(original.codigo_minsa)} → ${this.fmt(row.codigo_minsa)}`);
    }
    if (this.textoDistinto(row.categoria, original.categoria)) {
      detalles.push(`grupo: ${this.fmt(original.categoria)} → ${this.fmt(row.categoria)}`);
    }
    if (this.textoDistinto(row.nombre, original.nombre)) {
      detalles.push(`nombre: ${this.fmt(original.nombre)} → ${this.fmt(row.nombre)}`);
    }
    for (const c of this.camposNumericos) {
      if (!this.numeroIgual(row[c.key], original[c.key])) {
        detalles.push(
          `${c.label}: ${this.fmtNum(original[c.key])} → ${this.fmtNum(row[c.key])}`,
        );
      }
    }
    for (const m of this.meses) {
      const actual = this.mesActivo(row, m.key);
      const prev = this.mesActivo(original, m.key);
      if (actual !== prev) {
        detalles.push(`${m.label}: ${prev ? 'sí' : 'no'} → ${actual ? 'sí' : 'no'}`);
      }
    }
    if (detalles.length === 0) {
      return etiqueta;
    }
    return `${etiqueta}: ${detalles.join('; ')}`;
  }

  private filasIguales(a: AlimentoDatasetRow, b: AlimentoDatasetRow): boolean {
    if (this.textoDistinto(a.codigo_minsa, b.codigo_minsa)) {
      return false;
    }
    if (this.textoDistinto(a.categoria, b.categoria)) {
      return false;
    }
    if (this.textoDistinto(a.nombre, b.nombre)) {
      return false;
    }
    for (const c of this.camposNumericos) {
      if (!this.numeroIgual(a[c.key], b[c.key])) {
        return false;
      }
    }
    for (const m of this.meses) {
      if (this.mesActivo(a, m.key) !== this.mesActivo(b, m.key)) {
        return false;
      }
    }
    return true;
  }

  private clonarFilaComparacion(row: AlimentoDatasetRow): AlimentoDatasetRow {
    const copia: AlimentoDatasetRow = {
      id: row.id,
      _clave: row._clave,
      codigo_minsa: row.codigo_minsa ?? '',
      nombre: row.nombre ?? '',
      categoria: row.categoria ?? '',
      energia_kcal: row.energia_kcal,
      costo_kg_soles: row.costo_kg_soles,
      _dirty: false,
    };
    for (const c of this.camposNumericos) {
      if (c.key !== 'energia_kcal' && c.key !== 'costo_kg_soles') {
        (copia as Record<string, unknown>)[c.key as string] = row[c.key] ?? null;
      }
    }
    this.meses.forEach((m) => {
      (copia as Record<string, unknown>)[m.key] = this.mesActivo(row, m.key);
    });
    if (row.meses_disponibilidad) {
      copia.meses_disponibilidad = [...row.meses_disponibilidad];
    }
    return copia;
  }

  private textoDistinto(a?: string | null, b?: string | null): boolean {
    return (a ?? '').trim() !== (b ?? '').trim();
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
    return na === nb;
  }

  private fmt(val?: string | null): string {
    const t = (val ?? '').trim();
    return t || '(vacío)';
  }

  private fmtNum(val: unknown): string {
    if (val === null || val === undefined || val === '') {
      return '(vacío)';
    }
    return String(val);
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
    this.registrarOriginal(norm);
    const clave = this.claveFila(norm);
    const enCache = this.filasDirty.get(clave);
    if (enCache) {
      return { ...enCache, _dirty: true };
    }
    return norm;
  }

  private normalizarFila(a: AlimentoDatasetRow): AlimentoDatasetRow {
    const fila = { ...a, _dirty: false };
    if (
      Array.isArray(fila.meses_disponibilidad) &&
      fila.meses_disponibilidad.length === 1 &&
      Array.isArray(fila.meses_disponibilidad[0])
    ) {
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
    this.filasDirty.clear();
    this.filasOriginales.clear();
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
