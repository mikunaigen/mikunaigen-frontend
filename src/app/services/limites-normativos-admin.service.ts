import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type LimiteNormativoRow = {
  id: number;
  normativa: string;
  nutriente: string;
  etiquetaNutriente?: string;
  valorMaximo: number | string;
  unidad: string;
  descripcion?: string | null;
  actualizadoEn?: string | null;
  actualizadoPor?: string | null;
  actualizadoPorEmail?: string | null;
  _dirty?: boolean;
};

@Injectable({ providedIn: 'root' })
export class LimitesNormativosAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/limites-normativos`;

  listar(): Observable<{ items: LimiteNormativoRow[] }> {
    return this.http.get<{ items: LimiteNormativoRow[] }>(this.base);
  }

  guardarCambios(
    cambios: { id: number; valorMaximo: number; descripcion?: string | null }[],
  ): Observable<{ message: string; items: LimiteNormativoRow[] }> {
    return this.http.put<{ message: string; items: LimiteNormativoRow[] }>(this.base, { cambios });
  }
}
