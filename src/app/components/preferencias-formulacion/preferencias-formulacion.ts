import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import {
  AlimentoBusqueda,
  CapacidadesPreferencias,
  IngredienteExcluido,
  PreferenciasContextoDto,
  PreferenciasService,
} from '../../services/preferencias.service';

type EnfoqueOpcion = {
  codigo: string;
  titulo: string;
  descripcion: string;
  icon: string;
  bloqueado: boolean;
};

@Component({
  selector: 'app-preferencias-formulacion',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './preferencias-formulacion.component.html',
})
export class PreferenciasFormulacionComponent implements OnInit {
  @Input() modoOnboarding = false;
  @Input() compacto = false;
  @Output() guardado = new EventEmitter<void>();
  @Output() requiereConfiguracionChange = new EventEmitter<boolean>();

  private readonly preferenciasService = inject(PreferenciasService);
  private readonly busqueda$ = new Subject<string>();

  cargando = signal(true);
  guardando = signal(false);
  contexto = signal<PreferenciasContextoDto | null>(null);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  enfoquePrincipal = 'maxima_precision_nutricional';
  presupuestoMaximo: number | null = null;
  filtroEstacionalidadActivo = false;
  exclusiones: IngredienteExcluido[] = [];

  busquedaTexto = '';
  resultadosBusqueda = signal<AlimentoBusqueda[]>([]);
  buscando = signal(false);

  readonly enfoquesBase: Omit<EnfoqueOpcion, 'bloqueado'>[] = [
    {
      codigo: 'maxima_precision_nutricional',
      titulo: 'Alta Precisión Nutricional',
      descripcion: 'Prioriza el ajuste nutricional del modelo.',
      icon: 'heroBeaker',
    },
    {
      codigo: 'minimo_costo_produccion',
      titulo: 'Mínimo Costo de Producción',
      descripcion: 'Optimiza el costo por kilogramo de la formulación.',
      icon: 'heroBanknotes',
    },
    {
      codigo: 'maxima_biodiversidad',
      titulo: 'Máxima Biodiversidad',
      descripcion: 'Favorece variedad de ingredientes nativos.',
      icon: 'heroSparkles',
    },
  ];

  ngOnInit(): void {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const t = q.trim();
          if (t.length < 2) {
            this.buscando.set(false);
            this.resultadosBusqueda.set([]);
            return of([]);
          }
          this.buscando.set(true);
          return this.preferenciasService.buscarAlimentos(t);
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
  }

  cargar(): void {
    this.cargando.set(true);
    this.preferenciasService.obtener().subscribe({
      next: (ctx) => {
        this.cargando.set(false);
        this.aplicarContexto(ctx);
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudieron cargar las preferencias.',
        });
      },
    });
  }

  opcionesEnfoque(): EnfoqueOpcion[] {
    const cap = this.contexto()?.capacidades;
    return this.enfoquesBase.map((e) => ({
      ...e,
      bloqueado:
        (e.codigo === 'minimo_costo_produccion' && !cap?.puedeMinimoCosto) ||
        (e.codigo === 'maxima_biodiversidad' && !cap?.puedeMaximaBiodiversidad),
    }));
  }

  capacidades(): CapacidadesPreferencias | null {
    return this.contexto()?.capacidades ?? null;
  }

  seleccionarEnfoque(codigo: string, bloqueado: boolean): void {
    if (bloqueado) return;
    this.enfoquePrincipal = codigo;
  }

  onBusquedaInput(): void {
    this.busqueda$.next(this.busquedaTexto);
  }

  agregarExclusion(alimento: AlimentoBusqueda): void {
    const cap = this.capacidades();
    if (!cap?.puedeExcluirIngredientes) return;
    if (this.exclusiones.some((e) => e.alimentoId === alimento.id)) return;
    if (this.exclusiones.length >= cap.maxExclusiones) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Límite alcanzado',
        mensaje: `Puedes excluir hasta ${cap.maxExclusiones} ingredientes.`,
      });
      return;
    }
    this.exclusiones = [
      ...this.exclusiones,
      { alimentoId: alimento.id, nombre: alimento.nombre, categoria: alimento.categoria },
    ];
    this.busquedaTexto = '';
    this.resultadosBusqueda.set([]);
  }

  quitarExclusion(id: number): void {
    this.exclusiones = this.exclusiones.filter((e) => e.alimentoId !== id);
  }

  guardar(): void {
    const cap = this.capacidades();
    if (!cap) return;

    this.guardando.set(true);
    const payload = {
      enfoquePrincipal: this.enfoquePrincipal,
      presupuestoMaximo: cap.puedePresupuesto ? this.presupuestoMaximo : null,
      filtroEstacionalidadActivo: cap.puedeEstacionalidad ? this.filtroEstacionalidadActivo : false,
      ingredientesExcluidos: cap.puedeExcluirIngredientes
        ? this.exclusiones.map((e) => e.alimentoId)
        : [],
    };

    this.preferenciasService.guardar(payload).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.requiereConfiguracionChange.emit(res.requiereConfiguracion);
        this.modal.set({
          tipo: 'ok',
          titulo: 'Preferencias guardadas',
          mensaje: res.message || 'Tus preferencias se actualizaron correctamente.',
        });
        this.guardado.emit();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudieron guardar las preferencias.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  private aplicarContexto(ctx: PreferenciasContextoDto): void {
    this.contexto.set(ctx);
    const p = ctx.preferencias;
    this.enfoquePrincipal = p.enfoquePrincipal || 'maxima_precision_nutricional';
    this.presupuestoMaximo =
      p.presupuestoMaximo != null && p.presupuestoMaximo !== undefined
        ? Number(p.presupuestoMaximo)
        : null;
    this.filtroEstacionalidadActivo = !!p.filtroEstacionalidadActivo;
    this.exclusiones = [...(p.ingredientesExcluidos || [])];
    this.requiereConfiguracionChange.emit(ctx.requiereConfiguracion);
  }
}
