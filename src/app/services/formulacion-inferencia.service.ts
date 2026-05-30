import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ObjetivoNutricionalValores } from '../data/objetivo-nutricional-campos';

const base = `${environment.apiUrl}/formulacion/inferencia`;

export type CuotaInferenciaDto = {
  rol: string;
  limiteInferencias: number;
  inferenciasUsadas: number;
  inferenciasDisponibles: number;
  cuotaAgotada: boolean;
  fechaReinicioCuota: string;
  limiteHistorial: number;
  historialUsado: number;
  historialDisponible: number;
  historialLleno: boolean;
  historialBloqueadoPorPlan?: boolean;
};

export type PreparacionInferenciaDto = {
  modeloDisponible: boolean;
  mensajeModelo: string | null;
  cuota: CuotaInferenciaDto;
  rol: string;
  descargoAceptado?: boolean;
};

export type IngredienteRecetaDto = {
  alimentoId?: number;
  nombre?: string;
  categoria?: string;
  porcentaje?: number;
};

export type AlternativaRecetaDto = {
  id: string;
  sesionId?: string;
  modoOptimizacion: string;
  tituloModo: string;
  costoEstimadoKg: number | null;
  mae: number | null;
  esSegura: boolean;
  mostrarCosto: boolean;
  rol: string;
  ingredientes: IngredienteRecetaDto[];
  semaforo?: Record<string, string>;
  semaforoDetalle?: Record<string, Record<string, unknown>>;
  semaforoExtendido?: {
    verificacionCodex?: Array<{
      nutriente: string;
      logrado: number;
      limiteCodex: number;
      cumple: boolean;
      referencia: string;
    }>;
    verificacionLey30021?: Array<{
      nutriente: string;
      logrado: number;
      umbralLey: number;
      activaOctogono: boolean;
      octogono: string;
      referencia: string;
    }>;
  };
  perfilNutricional?: Record<string, { objetivo: number; logrado: number; desviacion: number }>;
  calificada?: boolean;
  calificacionEstrellas?: number;
  calificacionComentario?: string | null;
};

export type SesionInferenciaDto = {
  sesionId: string;
  recuperada?: boolean;
  mensajeRecuperacion?: string;
  forzarDisponible?: boolean;
  alternativas: AlternativaRecetaDto[];
  cuota?: CuotaInferenciaDto;
  descartadosEstacionalidad?: Record<string, number>;
  mensajeEstacionalidad?: string;
};

export type EvaluarGuardadoHistorialDto = {
  limiteHistorial: number;
  historialUsado: number;
  historialBloqueadoPorPlan: boolean;
  puedeGuardarDirecto: boolean;
  requiereReemplazo: boolean;
  modoReemplazo?: 'automatico' | 'manual';
  mensaje?: string;
  recetaAReemplazar?: HistorialRecetaDto;
  opcionesReemplazo?: HistorialRecetaDto[];
};

export type UltimaConfiguracionFormulacionDto = {
  disponible: boolean;
  message?: string;
  fechaUltimaFormulacion?: string;
  objetivo?: ObjetivoNutricionalValores;
  parametrizacion?: Record<string, unknown>;
};

export type GuardarHistorialPayload = {
  nombre: string;
  reemplazarId?: string;
  confirmarReemplazoAutomatico?: boolean;
};

export type HistorialRecetaDto = {
  id: string;
  nombre: string;
  fecha: string;
  modoOptimizacion: string;
  tituloModo: string;
  mostrarCosto: boolean;
  costoEstimadoKg: number | null;
};

@Injectable({ providedIn: 'root' })
export class FormulacionInferenciaService {
  private readonly http = inject(HttpClient);

  preparacion(): Observable<PreparacionInferenciaDto> {
    return this.http.get<PreparacionInferenciaDto>(`${base}/preparacion`);
  }

  aceptarDescargo(): Observable<{ message: string; descargoAceptado: boolean }> {
    return this.http.post<{ message: string; descargoAceptado: boolean }>(`${base}/descargo/aceptar`, {});
  }

  ultimaConfiguracion(): Observable<UltimaConfiguracionFormulacionDto> {
    return this.http.get<UltimaConfiguracionFormulacionDto>(`${base}/ultima-configuracion`);
  }

  calificarReceta(
    id: string,
    payload: { estrellas: number; comentario?: string },
  ): Observable<{ message: string; calificada: boolean; estrellas: number }> {
    return this.http.post<{ message: string; calificada: boolean; estrellas: number }>(
      `${base}/receta/${id}/calificacion`,
      payload,
    );
  }

  estadoCalificacion(id: string): Observable<{ calificada: boolean; estrellas?: number; comentario?: string }> {
    return this.http.get<{ calificada: boolean; estrellas?: number; comentario?: string }>(
      `${base}/receta/${id}/calificacion`,
    );
  }

  ejecutar(objetivo: ObjetivoNutricionalValores, forzar = false): Observable<SesionInferenciaDto> {
    return this.http.post<SesionInferenciaDto>(`${base}/ejecutar`, { objetivo, forzar });
  }

  obtenerSesion(sesionId: string): Observable<SesionInferenciaDto> {
    return this.http.get<SesionInferenciaDto>(`${base}/sesion/${sesionId}`);
  }

  detalleReceta(id: string): Observable<AlternativaRecetaDto> {
    return this.http.get<AlternativaRecetaDto>(`${base}/receta/${id}`);
  }

  evaluarGuardadoHistorial(id: string): Observable<EvaluarGuardadoHistorialDto> {
    return this.http.get<EvaluarGuardadoHistorialDto>(`${base}/historial/${id}/evaluar-guardado`);
  }

  guardarHistorial(id: string, payload: GuardarHistorialPayload): Observable<{ message: string; id: string; recetaReemplazada?: string }> {
    return this.http.post<{ message: string; id: string; recetaReemplazada?: string }>(`${base}/historial/${id}`, payload);
  }

  listarHistorial(q?: string): Observable<HistorialRecetaDto[]> {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<HistorialRecetaDto[]>(`${base}/historial${params}`);
  }

  eliminarHistorial(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${base}/historial/${id}`);
  }

  editarReceta(id: string, ingredientes: IngredienteRecetaDto[]): Observable<AlternativaRecetaDto> {
    return this.http.put<AlternativaRecetaDto>(`${base}/receta/${id}/editar`, { ingredientes });
  }

  exportarReceta(id: string, formato: 'xlsx' | 'pdf'): Observable<Blob> {
    return this.http.get(`${base}/receta/${id}/exportar?formato=${formato}`, {
      responseType: 'blob',
    });
  }
}
