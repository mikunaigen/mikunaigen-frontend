import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type SolicitudPendienteUsuario = {
  id: number;
  estado?: string;
  rolSolicitado?: string;
  justificacion?: string;
  fechaSolicitud?: string;
  tieneComprobante?: boolean;
};

export type UsuarioAdminItem = {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  rol?: string;
  estadoSuscripcion?: string;
  estadoCuenta?: string;
  estadoCuentaCodigo?: string;
  fechaRegistro?: string;
  fechaInicioPlan?: string;
  fechaFinPlan?: string;
  puedeRenovar?: boolean;
  suspendido?: boolean;
  solicitudPendiente?: SolicitudPendienteUsuario | null;
};

@Injectable({ providedIn: 'root' })
export class AdminUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl + '/admin/usuarios';

  listar(filtros?: { busqueda?: string; rol?: string; plan?: string }): Observable<{ usuarios: UsuarioAdminItem[] }> {
    let params = new HttpParams();
    if (filtros?.busqueda?.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
    }
    if (filtros?.rol?.trim()) {
      params = params.set('rol', filtros.rol.trim());
    }
    if (filtros?.plan?.trim()) {
      params = params.set('plan', filtros.plan.trim());
    }
    return this.http.get<{ usuarios: UsuarioAdminItem[] }>(this.api, { params });
  }

  renovarSuscripcion(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/renovar-suscripcion`, {});
  }

  desactivar(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/desactivar`, {});
  }

  reactivar(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/reactivar`, {});
  }
}
