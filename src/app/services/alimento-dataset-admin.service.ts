import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type AlimentoDatasetRow = {
  id?: number | null;
  codigo_minsa?: string | null;
  nombre: string;
  categoria: string;
  energia_kcal: number | null;
  agua_g?: number | null;
  proteinas_g?: number | null;
  grasa_total_g?: number | null;
  carbohidratos_totales_g?: number | null;
  carbohidratos_disponibles_g?: number | null;
  fibra_g?: number | null;
  cenizas_g?: number | null;
  calcio_mg?: number | null;
  fosforo_mg?: number | null;
  zinc_mg?: number | null;
  hierro_mg?: number | null;
  beta_caroteno_ug?: number | null;
  vitamina_a_ug?: number | null;
  tiamina_mg?: number | null;
  riboflavina_mg?: number | null;
  niacina_mg?: number | null;
  vitamina_c_mg?: number | null;
  acido_folico_ug?: number | null;
  sodio_mg?: number | null;
  potasio_mg?: number | null;
  costo_kg_soles: number | null;
  meses_disponibilidad?: number[];
  enero?: boolean;
  febrero?: boolean;
  marzo?: boolean;
  abril?: boolean;
  mayo?: boolean;
  junio?: boolean;
  julio?: boolean;
  agosto?: boolean;
  septiembre?: boolean;
  octubre?: boolean;
  noviembre?: boolean;
  diciembre?: boolean;
  fecha_modificacion?: string;
  modificado_por_nombre?: string;
  _clave?: string;
  _dirty?: boolean;
};

export type DatasetEstadoDto = {
  vacio: boolean;
  total: number;
  columnasCsv: string[];
};

export type FiltrosMetaDto = {
  grupos: string[];
  categoriasPermitidas: string[];
  camposNutricionales: string[];
  rangosFiltro: { id: string; etiqueta: string }[];
};

@Injectable({ providedIn: 'root' })
export class AlimentoDatasetAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/alimentos-dataset`;

  estado(): Observable<DatasetEstadoDto> {
    return this.http.get<DatasetEstadoDto>(`${this.base}/estado`);
  }

  filtros(): Observable<FiltrosMetaDto> {
    return this.http.get<FiltrosMetaDto>(`${this.base}/filtros`);
  }

  listar(params: Record<string, string | number | undefined>): Observable<{ alimentos: AlimentoDatasetRow[]; total: number }> {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        q[k] = String(v);
      }
    }
    return this.http.get<{ alimentos: AlimentoDatasetRow[]; total: number }>(this.base, { params: q });
  }

  crear(body: AlimentoDatasetRow): Observable<{ message: string; alimento: AlimentoDatasetRow }> {
    return this.http.post<{ message: string; alimento: AlimentoDatasetRow }>(this.base, this.aPayload(body));
  }

  actualizar(id: number, body: AlimentoDatasetRow): Observable<{ message: string; alimento: AlimentoDatasetRow }> {
    return this.http.put<{ message: string; alimento: AlimentoDatasetRow }>(`${this.base}/${id}`, this.aPayload(body));
  }

  guardarLote(items: AlimentoDatasetRow[]): Observable<{ message: string; creados: number; actualizados: number }> {
    return this.http.put<{ message: string; creados: number; actualizados: number }>(`${this.base}/lote`, {
      items: items.map((i) => this.aPayload(i)),
    });
  }

  importarCsv(archivo: File): Observable<{ message: string; registrosProcesados: number; total: number }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<{ message: string; registrosProcesados: number; total: number }>(
      `${this.base}/importar-csv`,
      fd,
    );
  }

  aPayload(row: AlimentoDatasetRow): Record<string, unknown> {
    const meses: number[] = [];
    const mesesNombres = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    mesesNombres.forEach((m, idx) => {
      if ((row as Record<string, unknown>)[m]) {
        meses.push(idx + 1);
      }
    });
    return {
      id: row.id ?? null,
      codigo_minsa: row.codigo_minsa ?? '',
      nombre: row.nombre,
      categoria: row.categoria,
      energia_kcal: row.energia_kcal,
      agua_g: row.agua_g,
      proteinas_g: row.proteinas_g,
      grasa_total_g: row.grasa_total_g,
      carbohidratos_totales_g: row.carbohidratos_totales_g,
      carbohidratos_disponibles_g: row.carbohidratos_disponibles_g,
      fibra_g: row.fibra_g,
      cenizas_g: row.cenizas_g,
      calcio_mg: row.calcio_mg,
      fosforo_mg: row.fosforo_mg,
      zinc_mg: row.zinc_mg,
      hierro_mg: row.hierro_mg,
      beta_caroteno_ug: row.beta_caroteno_ug,
      vitamina_a_ug: row.vitamina_a_ug,
      tiamina_mg: row.tiamina_mg,
      riboflavina_mg: row.riboflavina_mg,
      niacina_mg: row.niacina_mg,
      vitamina_c_mg: row.vitamina_c_mg,
      acido_folico_ug: row.acido_folico_ug,
      sodio_mg: row.sodio_mg,
      potasio_mg: row.potasio_mg,
      costo_kg_soles: row.costo_kg_soles,
      meses_disponibilidad: meses,
    };
  }
}
