import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type RegistroAuditoriaSeguridadDto = {
  id: string;
  fecha: string;
  usuarioId: string;
  usuarioEmail: string | null;
  usuarioNombre: string;
  parametrosIngresados: Record<string, unknown> | null;
  componenteInfractor: string | null;
  valorInfractor: number | null;
  modoOptimizacion: string;
  alertaUsuarioDia: boolean;
};

export type DescartadasPorMesDto = {
  mes: string;
  total: number;
};

export type AuditoriaSeguridadDto = {
  registros: RegistroAuditoriaSeguridadDto[];
  total: number;
  descartadasPorMes: DescartadasPorMesDto[];
};

export type FiltrosAuditoriaSeguridad = {
  fechaDesde?: string;
  fechaHasta?: string;
  usuario?: string;
  componente?: string;
};

@Injectable({ providedIn: 'root' })
export class AuditoriaSeguridadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/auditoria-seguridad`;

  consultar(filtros: FiltrosAuditoriaSeguridad = {}): Observable<AuditoriaSeguridadDto> {
    let params = new HttpParams();
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }
    if (filtros.usuario) {
      params = params.set('usuario', filtros.usuario);
    }
    if (filtros.componente) {
      params = params.set('componente', filtros.componente);
    }
    return this.http.get<AuditoriaSeguridadDto>(this.base, { params });
  }
}
