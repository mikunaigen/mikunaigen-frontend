import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const STORAGE_KEY = 'mikunaigen_parametrizacion';

export type IngredienteRestriccion = {
  alimentoId: number;
  nombre?: string;
  categoria?: string;
};

export type CabezaOptimizacionDef = {
  codigo: string;
  titulo: string;
  prioriza: string;
  sacrifica: string;
  icon: string;
};

export type CapacidadesParametrizacion = {
  puedeMinimoCosto: boolean;
  puedeMaximaBiodiversidad: boolean;
  puedePresupuesto: boolean;
  puedeExcluirIngredientes: boolean;
  puedePriorizarIngredientes: boolean;
  puedeEstacionalidad: boolean;
  maxExclusiones: number;
  maxPriorizados: number;
  maxCabezasOptimizacion: number;
  minCabezasOptimizacion: number;
  nombreMesActual: string;
  mensajePlanBloqueado: string;
};

export type ParametrizacionDto = {
  cabezasOptimizacion: string[];
  enfoquePrincipal: string;
  presupuestoMaximo?: number | null;
  filtroEstacionalidadActivo: boolean;
  ingredientesExcluidos: IngredienteRestriccion[];
  ingredientesPriorizados: IngredienteRestriccion[];
  mensajePresupuestoExcedido?: string;
};

export type ParametrizacionContextoDto = {
  rol: string;
  capacidades: CapacidadesParametrizacion;
  parametrizacion: ParametrizacionDto;
  categorias: string[];
  rangosPresupuesto: { tipo: string; valor: number; etiqueta: string }[];
  cabezasOptimizacion: CabezaOptimizacionDef[];
};

export type AlimentoBusqueda = {
  id: number;
  nombre: string;
  categoria: string;
  codigo_minsa?: string;
};

export type ComposicionAlimento = Record<string, number | string | null>;

@Injectable({ providedIn: 'root' })
export class ParametrizacionFormulacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/formulacion/parametrizacion`;

  obtenerContexto(): Observable<ParametrizacionContextoDto> {
    return this.http.get<ParametrizacionContextoDto>(`${this.base}/contexto`);
  }

  guardar(payload: Record<string, unknown>): Observable<{ message: string; parametrizacion: ParametrizacionDto }> {
    return this.http.put<{ message: string; parametrizacion: ParametrizacionDto }>(this.base, payload);
  }

  buscarAlimentos(q: string, categoria: string): Observable<AlimentoBusqueda[]> {
    const params: Record<string, string> = {};
    if (q.trim()) params['q'] = q.trim();
    if (categoria.trim()) params['categoria'] = categoria.trim();
    return this.http.get<AlimentoBusqueda[]>(`${this.base}/alimentos`, { params });
  }

  composicionAlimento(id: number): Observable<ComposicionAlimento> {
    return this.http.get<ComposicionAlimento>(`${this.base}/alimentos/${id}/composicion`);
  }

  guardarSesion(data: ParametrizacionDto): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  leerSesion(): ParametrizacionDto | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ParametrizacionDto;
    } catch {
      return null;
    }
  }
}
