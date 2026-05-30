import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../services/auth.service';
import { ObjetivoNutricionalService } from '../../services/objetivo-nutricional.service';
import {
  AlternativaRecetaDto,
  EvaluarGuardadoHistorialDto,
  FormulacionInferenciaService,
  HistorialRecetaDto,
  IngredienteRecetaDto,
  PreparacionInferenciaDto,
  SesionInferenciaDto,
} from '../../services/formulacion-inferencia.service';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { GraficosRecetaFormulacionComponent } from '../graficos-receta-formulacion/graficos-receta-formulacion';
import { SemaforoNormativoComponent } from '../semaforo-normativo/semaforo-normativo';
import { TEXTO_DESCARGO_RESPONSABILIDAD } from '../../utils/form-validators';

@Component({
  selector: 'app-formular-receta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    CompradorNavComponent,
    LogoutButtonComponent,
    GraficosRecetaFormulacionComponent,
    SemaforoNormativoComponent,
  ],
  templateUrl: './formular-receta.component.html',
})
export class FormularRecetaComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly objetivoService = inject(ObjetivoNutricionalService);
  private readonly inferenciaService = inject(FormulacionInferenciaService);

  preparacion = signal<PreparacionInferenciaDto | null>(null);
  sesion = signal<SesionInferenciaDto | null>(null);
  cargando = signal(true);
  inferiendo = signal(false);
  modal = signal<{ tipo: 'ok' | 'error' | 'warn'; titulo: string; mensaje: string } | null>(null);

  vistaComparar = signal(false);
  recetaPrincipalId = signal<string | null>(null);
  editandoId = signal<string | null>(null);
  editIngredientes: IngredienteRecetaDto[] = [];
  nombreGuardarTexto = '';
  guardarModalId = signal<string | null>(null);
  evaluacionGuardado = signal<EvaluarGuardadoHistorialDto | null>(null);
  reemplazoSeleccionadoId = signal<string | null>(null);
  mostrarForzar = signal(false);
  descargoAceptado = signal(false);
  mostrarModalDescargo = signal(false);
  aceptandoDescargo = signal(false);

  calificandoId = signal<string | null>(null);
  estrellasSeleccionadas = signal(0);
  hoverEstrella = signal(0);
  comentarioCalificacion = '';
  enviandoCalificacion = signal(false);
  mensajeCalificacionEnviada = signal<string | null>(null);

  readonly textoDescargo = TEXTO_DESCARGO_RESPONSABILIDAD;
  readonly estrellasOpciones = [1, 2, 3, 4, 5];

  readonly Math = Math;

  alternativas = computed(() => this.sesion()?.alternativas ?? []);
  puedeComparar = computed(() => this.alternativas().length >= 2);
  rol = computed(() => this.preparacion()?.rol ?? 'estudiante');

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/formular' } });
      return;
    }
    if (this.auth.esAdministrador() || !this.auth.esUsuarioFormulacion()) {
      void this.router.navigate(['/login']);
      return;
    }
    const objetivo = this.objetivoService.leerSesion();
    if (!objetivo) {
      void this.router.navigate(['/objetivo-nutricional']);
      return;
    }
    this.inferenciaService.preparacion().subscribe({
      next: (p) => {
        this.preparacion.set(p);
        this.descargoAceptado.set(!!p.descargoAceptado);
        this.mostrarModalDescargo.set(!p.descargoAceptado);
        this.cargando.set(false);
        const recetaId = this.route.snapshot.queryParamMap.get('recetaId');
        if (recetaId) {
          this.inferenciaService.detalleReceta(recetaId).subscribe({
            next: (alt) => {
              this.sesion.set({
                sesionId: alt.sesionId ?? '',
                alternativas: [alt],
                recuperada: true,
              });
            },
          });
        }
      },
      error: () => {
        this.cargando.set(false);
        this.modal.set({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo cargar el estado de inferencia.' });
      },
    });
  }

  modeloDisponible(): boolean {
    return !!this.preparacion()?.modeloDisponible;
  }

  mensajeModelo(): string {
    return this.preparacion()?.mensajeModelo
      ?? 'No hay modelo de generación de recetas de superalimentos disponible';
  }

  cuotaAgotada(): boolean {
    return !!this.preparacion()?.cuota?.cuotaAgotada;
  }

  aceptarDescargo(): void {
    this.aceptandoDescargo.set(true);
    this.inferenciaService.aceptarDescargo().subscribe({
      next: () => {
        this.aceptandoDescargo.set(false);
        this.descargoAceptado.set(true);
        this.mostrarModalDescargo.set(false);
      },
      error: (err) => {
        this.aceptandoDescargo.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo registrar la aceptación del descargo.',
        });
      },
    });
  }

  abrirCalificacion(id: string): void {
    this.calificandoId.set(id);
    this.estrellasSeleccionadas.set(0);
    this.hoverEstrella.set(0);
    this.comentarioCalificacion = '';
    this.mensajeCalificacionEnviada.set(null);
  }

  cerrarCalificacion(): void {
    this.calificandoId.set(null);
    this.estrellasSeleccionadas.set(0);
    this.hoverEstrella.set(0);
    this.comentarioCalificacion = '';
  }

  seleccionarEstrella(valor: number): void {
    this.estrellasSeleccionadas.set(valor);
    this.hoverEstrella.set(0);
  }

  marcarHoverEstrella(valor: number): void {
    this.hoverEstrella.set(valor);
  }

  limpiarHoverEstrella(): void {
    this.hoverEstrella.set(0);
  }

  estrellasVisibles(): number {
    return Math.max(this.estrellasSeleccionadas(), this.hoverEstrella());
  }

  estrellaActiva(posicion: number, valor: number): boolean {
    return posicion <= valor;
  }

  enviarCalificacion(id: string): void {
    const estrellas = this.estrellasSeleccionadas();
    if (estrellas < 1) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Calificación incompleta',
        mensaje: 'Debes seleccionar al menos 1 estrella.',
      });
      return;
    }
    const comentario = this.comentarioCalificacion.trim();
    if (comentario.length > 500) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Comentario muy largo',
        mensaje: 'El comentario no puede superar 500 caracteres.',
      });
      return;
    }

    this.enviandoCalificacion.set(true);
    this.inferenciaService.calificarReceta(id, { estrellas, comentario: comentario || undefined }).subscribe({
      next: (res) => {
        this.enviandoCalificacion.set(false);
        this.mensajeCalificacionEnviada.set(res.message);
        this.actualizarCalificacionAlternativa(id, estrellas, comentario);
        this.calificandoId.set(null);
      },
      error: (err) => {
        this.enviandoCalificacion.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'No se pudo calificar',
          mensaje: err?.error?.message || 'Error al enviar la calificación.',
        });
      },
    });
  }

  formular(forzar = false): void {
    if (!this.descargoAceptado()) {
      this.mostrarModalDescargo.set(true);
      return;
    }
    const objetivo = this.objetivoService.leerSesion();
    if (!objetivo) {
      void this.router.navigate(['/objetivo-nutricional']);
      return;
    }
    if (!this.modeloDisponible()) return;
    if (!forzar && this.cuotaAgotada()) {
      this.mostrarCuotaAgotada();
      return;
    }

    this.inferiendo.set(true);
    this.mostrarForzar.set(false);
    this.inferenciaService.ejecutar(objetivo, forzar).subscribe({
      next: (ses) => {
        this.inferiendo.set(false);
        this.sesion.set(ses);
        if (ses.recuperada) {
          this.mostrarForzar.set(true);
          this.modal.set({
            tipo: 'ok',
            titulo: 'Resultados recuperados',
            mensaje: ses.mensajeRecuperacion
              ?? 'Los resultados fueron recuperados sin descontar cuota.',
          });
        }
        if (ses.mensajeEstacionalidad) {
          this.modal.set({
            tipo: 'ok',
            titulo: 'Estacionalidad',
            mensaje: ses.mensajeEstacionalidad,
          });
        }
        this.inferenciaService.preparacion().subscribe({ next: (p) => this.preparacion.set(p) });
      },
      error: (err) => {
        this.inferiendo.set(false);
        const msg = err?.error?.message || 'Falló la inferencia. Intenta ajustar los parámetros.';
        if (err?.status === 429 || err?.status === 409) {
          this.mostrarCuotaAgotada(msg);
        } else {
          this.modal.set({ tipo: 'error', titulo: 'Error de inferencia', mensaje: msg });
        }
      },
    });
  }

  ejecutarForzado(): void {
    this.modal.set({
      tipo: 'warn',
      titulo: 'Confirmar ejecución',
      mensaje: 'Forzar una nueva ejecución consumirá una inferencia de tu límite mensual.',
    });
    this.mostrarForzar.set(true);
  }

  confirmarForzar(): void {
    this.cerrarModal();
    this.formular(true);
  }

  mostrarCuotaAgotada(msg?: string): void {
    const c = this.preparacion()?.cuota;
    let mensaje = msg ?? `Has usado ${c?.inferenciasUsadas}/${c?.limiteInferencias} inferencias este mes. Reinicio: ${c?.fechaReinicioCuota}.`;
    const rol = this.rol();
    if (rol === 'estudiante' || rol === 'emprendedor') {
      mensaje += ' Puedes solicitar ascenso de plan en Mi perfil.';
    }
    this.modal.set({ tipo: 'error', titulo: 'Límite mensual alcanzado', mensaje });
  }

  alternarComparar(): void {
    this.vistaComparar.update((v) => !v);
  }

  seleccionarPrincipal(id: string): void {
    this.recetaPrincipalId.set(id);
    this.modal.set({ tipo: 'ok', titulo: 'Receta principal', mensaje: 'Alternativa seleccionada como receta principal.' });
  }

  iniciarEdicion(alt: AlternativaRecetaDto): void {
    this.editandoId.set(alt.id);
    this.editIngredientes = (alt.ingredientes || []).map((i) => ({ ...i }));
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.editIngredientes = [];
  }

  sumaPorcentajes(): number {
    return this.editIngredientes.reduce((s, i) => s + Number(i.porcentaje || 0), 0);
  }

  restablecerOriginal(alt: AlternativaRecetaDto): void {
    this.editIngredientes = (alt.ingredientes || []).map((i) => ({ ...i }));
  }

  guardarEdicion(): void {
    const id = this.editandoId();
    if (!id) return;
    const suma = this.sumaPorcentajes();
    if (Math.abs(suma - 100) > 0.05) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Porcentajes inválidos',
        mensaje: `La suma es ${suma.toFixed(2)}%. Debe ser 100% (diferencia ${(suma - 100).toFixed(2)}%).`,
      });
      return;
    }
    this.inferenciaService.editarReceta(id, this.editIngredientes).subscribe({
      next: (actualizada) => {
        this.actualizarAlternativa(actualizada);
        this.editandoId.set(null);
        this.modal.set({ tipo: 'ok', titulo: 'Receta actualizada', mensaje: 'Los cambios pasaron el filtro de seguridad.' });
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'Modificación rechazada',
          mensaje: err?.error?.message || 'La combinación no cumple los límites normativos.',
        });
      },
    });
  }

  abrirGuardar(id: string): void {
    if (this.historialBloqueado()) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Historial bloqueado',
        mensaje: 'Tu historial supera el límite de tu plan. Elimina recetas manualmente antes de guardar nuevas.',
      });
      return;
    }
    this.guardarModalId.set(id);
    this.nombreGuardarTexto = '';
    this.evaluacionGuardado.set(null);
    this.reemplazoSeleccionadoId.set(null);
  }

  historialBloqueado(): boolean {
    return !!this.preparacion()?.cuota?.historialBloqueadoPorPlan;
  }

  confirmarGuardar(): void {
    const id = this.guardarModalId();
    const nombre = this.nombreGuardarTexto.trim();
    if (!id) return;
    if (!nombre) {
      this.modal.set({ tipo: 'error', titulo: 'Nombre requerido', mensaje: 'Ingresa un nombre para la receta.' });
      return;
    }
    if (nombre.length > 100) {
      this.modal.set({ tipo: 'error', titulo: 'Nombre muy largo', mensaje: 'Máximo 100 caracteres.' });
      return;
    }

    const evalActual = this.evaluacionGuardado();
    if (evalActual?.requiereReemplazo) {
      this.ejecutarGuardadoConReemplazo(id, nombre, evalActual);
      return;
    }

    this.inferenciaService.evaluarGuardadoHistorial(id).subscribe({
      next: (evaluacion) => {
        if (evaluacion.historialBloqueadoPorPlan) {
          this.modal.set({
            tipo: 'error',
            titulo: 'Historial bloqueado',
            mensaje: evaluacion.mensaje || 'Elimina recetas manualmente antes de guardar nuevas.',
          });
          return;
        }
        if (evaluacion.requiereReemplazo) {
          this.evaluacionGuardado.set(evaluacion);
          if (evaluacion.modoReemplazo === 'manual' && evaluacion.opcionesReemplazo?.length) {
            this.reemplazoSeleccionadoId.set(evaluacion.opcionesReemplazo[0].id);
          }
          return;
        }
        this.ejecutarGuardado(id, nombre);
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'No se pudo evaluar',
          mensaje: err?.error?.message || 'Error al evaluar el guardado.',
        });
      },
    });
  }

  cancelarReemplazo(): void {
    this.evaluacionGuardado.set(null);
    this.reemplazoSeleccionadoId.set(null);
  }

  confirmarReemplazo(): void {
    const id = this.guardarModalId();
    const nombre = this.nombreGuardarTexto.trim();
    const evaluacion = this.evaluacionGuardado();
    if (!id || !evaluacion) return;
    this.ejecutarGuardadoConReemplazo(id, nombre, evaluacion);
  }

  private ejecutarGuardadoConReemplazo(id: string, nombre: string, evaluacion: EvaluarGuardadoHistorialDto): void {
    if (evaluacion.modoReemplazo === 'automatico') {
      this.ejecutarGuardado(id, nombre, { confirmarReemplazoAutomatico: true });
      return;
    }
    const reemplazarId = this.reemplazoSeleccionadoId();
    if (!reemplazarId) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Selección requerida',
        mensaje: 'Debes seleccionar una receta del historial para reemplazar.',
      });
      return;
    }
    this.ejecutarGuardado(id, nombre, { reemplazarId });
  }

  private ejecutarGuardado(
    id: string,
    nombre: string,
    extra?: { reemplazarId?: string; confirmarReemplazoAutomatico?: boolean },
  ): void {
    this.inferenciaService.guardarHistorial(id, {
      nombre,
      reemplazarId: extra?.reemplazarId,
      confirmarReemplazoAutomatico: extra?.confirmarReemplazoAutomatico,
    }).subscribe({
      next: (res) => {
        this.guardarModalId.set(null);
        this.evaluacionGuardado.set(null);
        this.reemplazoSeleccionadoId.set(null);
        this.inferenciaService.preparacion().subscribe({ next: (p) => this.preparacion.set(p) });
        this.modal.set({ tipo: 'ok', titulo: 'Receta guardada', mensaje: res.message });
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'No se pudo guardar',
          mensaje: err?.error?.message || 'Error al guardar en historial.',
        });
      },
    });
  }

  opcionesReemplazo(): HistorialRecetaDto[] {
    return this.evaluacionGuardado()?.opcionesReemplazo ?? [];
  }

  recetaAReemplazar(): HistorialRecetaDto | null {
    return this.evaluacionGuardado()?.recetaAReemplazar ?? null;
  }

  exportar(id: string, formato: 'xlsx' | 'pdf'): void {
    const rol = this.rol();
    if (rol === 'estudiante') return;
    this.inferenciaService.exportarReceta(id, formato).subscribe({
      next: (blob) => {
        const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receta_superalimento.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'Exportación',
          mensaje: err?.error?.message || 'No se pudo exportar la ficha técnica.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  puedeExportar(): boolean {
    return this.rol() !== 'estudiante';
  }

  puedeExportarPdf(): boolean {
    return this.rol() === 'nutricionista';
  }

  private actualizarAlternativa(actualizada: AlternativaRecetaDto): void {
    const ses = this.sesion();
    if (!ses) return;
    const alts = ses.alternativas.map((a) => (a.id === actualizada.id ? actualizada : a));
    this.sesion.set({ ...ses, alternativas: alts });
  }

  private actualizarCalificacionAlternativa(id: string, estrellas: number, comentario: string): void {
    const ses = this.sesion();
    if (!ses) return;
    const alts = ses.alternativas.map((a) =>
      a.id === id
        ? {
            ...a,
            calificada: true,
            calificacionEstrellas: estrellas,
            calificacionComentario: comentario || null,
          }
        : a,
    );
    this.sesion.set({ ...ses, alternativas: alts });
  }
}
