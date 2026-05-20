import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type IngredienteExcluido = {
  alimentoId: number;
  nombre?: string;
  categoria?: string;
};

export type PreferenciasDto = {
  enfoquePrincipal: string;
  presupuestoMaximo?: number | null;
  filtroEstacionalidadActivo: boolean;
  preferenciasCompletadas: boolean;
  ingredientesExcluidos: IngredienteExcluido[];
};

export type CapacidadesPreferencias = {
  puedeMinimoCosto: boolean;
  puedeMaximaBiodiversidad: boolean;
  puedePresupuesto: boolean;
  puedeExcluirIngredientes: boolean;
  puedeEstacionalidad: boolean;
  maxExclusiones: number;
  mensajePresupuestoBloqueado: string;
};

export type PreferenciasContextoDto = {
  rol: string;
  requiereConfiguracion: boolean;
  capacidades: CapacidadesPreferencias;
  preferencias: PreferenciasDto;
};

export type AlimentoBusqueda = {
  id: number;
  nombre: string;
  categoria: string;
};

export type GuardarPreferenciasPayload = {
  enfoquePrincipal: string;
  presupuestoMaximo?: number | null;
  filtroEstacionalidadActivo: boolean;
  ingredientesExcluidos: number[];
};

@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/preferencias`;

  obtenerContexto(): Observable<PreferenciasContextoDto> {
    return this.http.get<PreferenciasContextoDto>(`${this.base}/contexto`);
  }

  obtener(): Observable<PreferenciasContextoDto> {
    return this.http.get<PreferenciasContextoDto>(`${this.base}/me`);
  }

  guardar(payload: GuardarPreferenciasPayload): Observable<{ message: string; requiereConfiguracion: boolean }> {
    return this.http.put<{ message: string; requiereConfiguracion: boolean }>(`${this.base}/me`, payload);
  }

  buscarAlimentos(q: string): Observable<AlimentoBusqueda[]> {
    return this.http.get<AlimentoBusqueda[]>(`${this.base}/alimentos`, { params: { q } });
  }
}
