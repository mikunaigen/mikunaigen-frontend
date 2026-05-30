import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  AlimentoBusqueda,
  CabezaOptimizacionDef,
  CapacidadesParametrizacion,
  ComposicionAlimento,
  IngredienteRestriccion,
  ParametrizacionContextoDto,
  ParametrizacionFormulacionService,
} from '../../services/parametrizacion-formulacion.service';
import {
  FormulacionInferenciaService,
  PreparacionInferenciaDto,
} from '../../services/formulacion-inferencia.service';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-parametrizacion-formulacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    CompradorNavComponent,
    LogoutButtonComponent,
  ],
  templateUrl: './parametrizacion-formulacion.component.html',
})
export class ParametrizacionFormulacionComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly parametrizacionService = inject(ParametrizacionFormulacionService);
  private readonly inferenciaService = inject(FormulacionInferenciaService);
  private readonly busqueda$ = new Subject<void>();

  contexto = signal<ParametrizacionContextoDto | null>(null);
  preparacionInferencia = signal<PreparacionInferenciaDto | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  buscando = signal(false);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  cabezasSeleccionadas: string[] = ['maxima_precision_nutricional'];
  definicionesCabezas: CabezaOptimizacionDef[] = [];
  presupuestoMaximo: number | null = null;
  filtroEstacionalidadActivo = false;
  exclusiones: IngredienteRestriccion[] = [];
  priorizados: IngredienteRestriccion[] = [];

  busquedaNombre = '';
  filtroCategoria = '';
  resultadosBusqueda = signal<AlimentoBusqueda[]>([]);
  errores = signal<Record<string, string>>({});

  composicionModal = signal<ComposicionAlimento | null>(null);
  composicionTitulo = signal('');

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/parametrizacion' } });
      return;
    }
    if (this.auth.esAdministrador()) {
      void this.router.navigate(['/gestion-administrador']);
      return;
    }
    if (!this.auth.esUsuarioFormulacion()) {
      void this.router.navigate(['/login']);
      return;
    }

    this.busqueda$
      .pipe(
        debounceTime(300),
        switchMap(() => {
          if (!this.busquedaNombre.trim() && !this.filtroCategoria.trim()) {
            this.buscando.set(false);
            this.resultadosBusqueda.set([]);
            return of([]);
          }
          this.buscando.set(true);
          return this.parametrizacionService.buscarAlimentos(this.busquedaNombre, this.filtroCategoria);
        }),
      )
      .subscribe({
        next: (lista) => {
          this.buscando.set(false);
          this.resultadosBusqueda.set(lista || []);
        },
        error: () => {
          this.buscando.set(false);
          this.resultadosBusqueda.set([]);
        },
      });

    this.cargar();
    this.inferenciaService.preparacion().subscribe({
      next: (p) => this.preparacionInferencia.set(p),
      error: () => this.preparacionInferencia.set(null),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.parametrizacionService.obtenerContexto().subscribe({
      next: (ctx) => {
        this.cargando.set(false);
        this.aplicarContexto(ctx);
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo cargar la parametrización.',
        });
      },
    });
  }

  capacidades(): CapacidadesParametrizacion | null {
    return this.contexto()?.capacidades ?? null;
  }

  cabezaSeleccionada(codigo: string): boolean {
    return this.cabezasSeleccionadas.includes(codigo);
  }

  cabezaBloqueada(codigo: string): boolean {
    const cap = this.capacidades();
    if (!cap) return true;
    if (codigo === 'minimo_costo_produccion' && !cap.puedeMinimoCosto) return true;
    if (codigo === 'maxima_biodiversidad' && !cap.puedeMaximaBiodiversidad) return true;
    return false;
  }

  alternarCabeza(codigo: string): void {
    if (this.cabezaBloqueada(codigo)) return;
    const cap = this.capacidades();
    if (!cap) return;

    if (this.cabezaSeleccionada(codigo)) {
      if (this.cabezasSeleccionadas.length <= cap.minCabezasOptimizacion) {
        this.modal.set({
          tipo: 'error',
          titulo: 'Selección mínima',
          mensaje: `Debes mantener al menos ${cap.minCabezasOptimizacion} modo de optimización.`,
        });
        return;
      }
      this.cabezasSeleccionadas = this.cabezasSeleccionadas.filter((c) => c !== codigo);
      return;
    }

    if (this.cabezasSeleccionadas.length >= cap.maxCabezasOptimizacion) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Límite de modos',
        mensaje: `Tu plan permite seleccionar hasta ${cap.maxCabezasOptimizacion} modo(s) de optimización.`,
      });
      return;
    }
    this.cabezasSeleccionadas = [...this.cabezasSeleccionadas, codigo];
  }

  aplicarRangoPresupuesto(valor: number): void {
    if (!this.capacidades()?.puedePresupuesto) return;
    this.presupuestoMaximo = valor;
    this.validarPresupuesto();
  }

  validarPresupuesto(): void {
    const cap = this.capacidades();
    const actuales = { ...this.errores() };
    delete actuales['presupuestoMaximo'];
    if (!cap?.puedePresupuesto) {
      this.errores.set(actuales);
      return;
    }
    if (this.presupuestoMaximo === null || this.presupuestoMaximo === undefined) {
      actuales['presupuestoMaximo'] = 'El costo máximo por kg es obligatorio.';
    } else if (Number.isNaN(Number(this.presupuestoMaximo)) || Number(this.presupuestoMaximo) <= 0) {
      actuales['presupuestoMaximo'] = 'Debe ser un valor numérico positivo.';
    }
    this.errores.set(actuales);
  }

  onBusquedaChange(): void {
    this.busqueda$.next();
  }

  agregarExcluir(alimento: AlimentoBusqueda): void {
    if (this.priorizados.some((p) => p.alimentoId === alimento.id)) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Conflicto',
        mensaje: 'Quita este ingrediente de la lista de priorizados antes de excluirlo.',
      });
      return;
    }
    if (this.exclusiones.some((e) => e.alimentoId === alimento.id)) return;
    const cap = this.capacidades();
    if (cap && this.exclusiones.length >= cap.maxExclusiones) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Límite',
        mensaje: `Máximo ${cap.maxExclusiones} ingredientes excluidos.`,
      });
      return;
    }
    this.exclusiones = [
      ...this.exclusiones,
      { alimentoId: alimento.id, nombre: alimento.nombre, categoria: alimento.categoria },
    ];
    this.busquedaNombre = '';
    this.resultadosBusqueda.set([]);
  }

  agregarPriorizar(alimento: AlimentoBusqueda): void {
    if (!this.capacidades()?.puedePriorizarIngredientes) return;
    if (this.exclusiones.some((e) => e.alimentoId === alimento.id)) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Conflicto',
        mensaje: 'Quita este ingrediente de la lista de excluidos antes de priorizarlo.',
      });
      return;
    }
    if (this.priorizados.some((p) => p.alimentoId === alimento.id)) return;
    const cap = this.capacidades();
    if (cap && this.priorizados.length >= cap.maxPriorizados) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Límite',
        mensaje: `Máximo ${cap.maxPriorizados} ingredientes priorizados.`,
      });
      return;
    }
    this.priorizados = [
      ...this.priorizados,
      { alimentoId: alimento.id, nombre: alimento.nombre, categoria: alimento.categoria },
    ];
    this.busquedaNombre = '';
    this.resultadosBusqueda.set([]);
  }

  quitarExclusion(id: number): void {
    this.exclusiones = this.exclusiones.filter((e) => e.alimentoId !== id);
  }

  quitarPriorizado(id: number): void {
    this.priorizados = this.priorizados.filter((p) => p.alimentoId !== id);
  }

  verComposicion(item: IngredienteRestriccion): void {
    this.parametrizacionService.composicionAlimento(item.alimentoId).subscribe({
      next: (data) => {
        this.composicionTitulo.set(item.nombre || 'Ingrediente');
        this.composicionModal.set(data);
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo cargar la composición nutricional.',
        });
      },
    });
  }

  cerrarComposicion(): void {
    this.composicionModal.set(null);
  }

  guardar(): void {
    this.validarPresupuesto();
    if (Object.keys(this.errores()).length > 0) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Validación',
        mensaje: 'Corrige los errores indicados en el formulario.',
      });
      return;
    }

    const cap = this.capacidades();
    if (!cap) return;

    if (this.cabezasSeleccionadas.length < cap.minCabezasOptimizacion
      || this.cabezasSeleccionadas.length > cap.maxCabezasOptimizacion) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Modo de optimización',
        mensaje: `Selecciona entre ${cap.minCabezasOptimizacion} y ${cap.maxCabezasOptimizacion} modo(s).`,
      });
      return;
    }

    this.guardando.set(true);
    const payload: Record<string, unknown> = {
      cabezasOptimizacion: this.cabezasSeleccionadas,
      filtroEstacionalidadActivo: cap.puedeEstacionalidad ? this.filtroEstacionalidadActivo : false,
      ingredientesExcluidos: this.exclusiones.map((e) => e.alimentoId),
      ingredientesPriorizados: this.priorizados.map((p) => p.alimentoId),
    };
    if (cap.puedePresupuesto) {
      payload['presupuestoMaximo'] = this.presupuestoMaximo;
    }

    this.parametrizacionService.guardar(payload).subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.parametrizacion) {
          this.parametrizacionService.guardarSesion(res.parametrizacion);
        }
        this.modal.set({
          tipo: 'ok',
          titulo: 'Parametrización guardada',
          mensaje: res.message || 'Los parámetros se guardaron para futuras sesiones.',
        });
      },
      error: (err) => {
        this.guardando.set(false);
        const erroresApi = err?.error?.errores as Record<string, string> | undefined;
        if (erroresApi) {
          this.errores.set(erroresApi);
        }
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo guardar la parametrización.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  puedeFormular(): boolean {
    return !!this.preparacionInferencia()?.modeloDisponible;
  }

  mensajeFormularBloqueado(): string {
    return this.preparacionInferencia()?.mensajeModelo
      ?? 'No hay modelo de generación de recetas de superalimentos disponible';
  }

  irFormular(): void {
    void this.router.navigate(['/formular']);
  }

  etiquetasComposicion(data: ComposicionAlimento): { label: string; valor: string }[] {
    const mapa: [string, string][] = [
      ['Energía', 'energia_kcal'],
      ['Proteínas', 'proteinas_g'],
      ['Grasa', 'grasa_total_g'],
      ['CHO disp.', 'carbohidratos_disponibles_g'],
      ['Fibra', 'fibra_g'],
      ['Hierro', 'hierro_mg'],
      ['Vit. C', 'vitamina_c_mg'],
      ['Costo S/kg', 'costo_kg_soles'],
    ];
    return mapa
      .map(([label, key]) => ({
        label,
        valor: data[key] != null ? String(data[key]) : '—',
      }));
  }

  private aplicarContexto(ctx: ParametrizacionContextoDto): void {
    this.contexto.set(ctx);
    this.definicionesCabezas = ctx.cabezasOptimizacion || [];
    const p = ctx.parametrizacion;
    this.cabezasSeleccionadas = [...(p.cabezasOptimizacion || ['maxima_precision_nutricional'])];
    if (ctx.rol === 'estudiante') {
      this.cabezasSeleccionadas = ['maxima_precision_nutricional'];
    }
    this.presupuestoMaximo =
      p.presupuestoMaximo != null && p.presupuestoMaximo !== undefined
        ? Number(p.presupuestoMaximo)
        : null;
    this.filtroEstacionalidadActivo = !!p.filtroEstacionalidadActivo;
    this.exclusiones = [...(p.ingredientesExcluidos || [])];
    this.priorizados = [...(p.ingredientesPriorizados || [])];
    this.errores.set({});
  }
}
