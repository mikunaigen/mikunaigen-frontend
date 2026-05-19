import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MediosPagoDto } from './config.service';

export type PlanDisponible = {
  codigo: string;
  nombre: string;
  precio: number;
  precioFormateado: string;
  beneficios: string;
};

export type SolicitudPlanResumen = {
  id?: number;
  estado?: string;
  rolSolicitado?: string;
  fechaSolicitud?: string;
};

export type PlanContextoDto = {
  rolActual: string;
  puedeSolicitarCambio: boolean;
  planesDisponibles: PlanDisponible[];
  mediosPago: MediosPagoDto;
  solicitudPendiente: SolicitudPlanResumen | null;
};

export type PlanWsEvento = {
  tipo?: string;
  solicitudId?: number;
  usuarioId?: string;
  estado?: string;
  rolSolicitado?: string;
  rolActual?: string;
  solicitudPendiente?: SolicitudPlanResumen | null;
  motivoRechazo?: string;
  message?: string;
};

export function topicPlanesUsuario(userId: string): string {
  return `/topic/planes/usuario/${userId}`;
}

export function topicPlanesAdmin(): string {
  return '/topic/planes/admin';
}

export function parsePlanWsEvento(raw: string): PlanWsEvento | null {
  try {
    return JSON.parse(raw) as PlanWsEvento;
  } catch {
    return null;
  }
}

export type SolicitudAdminItem = {
  id: number;
  estado: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  rolSolicitado?: string;
  justificacion?: string;
  motivoRechazo?: string;
  fechaSolicitud?: string;
  tieneComprobante?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PlanUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl + '/planes';
  private readonly apiAdmin = environment.apiUrl + '/admin/solicitudes-cambio-rol';

  obtenerContexto(): Observable<PlanContextoDto> {
    return this.http.get<PlanContextoDto>(`${this.api}/contexto`);
  }

  enviarSolicitud(rolSolicitado: string, justificacion: string, comprobante: File): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('rolSolicitado', rolSolicitado);
    fd.append('justificacion', justificacion);
    fd.append('comprobante', comprobante, comprobante.name);
    return this.http.post<{ message: string }>(`${this.api}/solicitud`, fd);
  }

  listarSolicitudesAdmin(estado?: string): Observable<{ solicitudes: SolicitudAdminItem[] }> {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return this.http.get<{ solicitudes: SolicitudAdminItem[] }>(`${this.apiAdmin}${q}`);
  }

  aprobar(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiAdmin}/${id}/aprobar`, {});
  }

  rechazar(id: number, motivo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiAdmin}/${id}/rechazar`, { motivo });
  }

  urlComprobante(id: number): string {
    return `${this.apiAdmin}/${id}/comprobante`;
  }

  obtenerComprobante(id: number): Observable<Blob> {
    return this.http.get(`${this.apiAdmin}/${id}/comprobante`, { responseType: 'blob' });
  }
}
