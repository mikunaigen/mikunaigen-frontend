import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type GraficoDashboardDto = {
  bloqueado: boolean;
  planRequerido?: string | null;
  etiquetas: string[];
  valores: number[];
  pdfBloqueado?: boolean;
  pdfPlanRequerido?: string;
};

export type UsuarioDashboardDto = {
  usuario: {
    nombre: string;
    rol: string;
    fechaFinPlan?: string | null;
    diasRestantesPlan?: number | null;
  };
  modeloDisponible: boolean;
  mensajeModelo?: string | null;
  cuota: {
    rol?: string;
    limiteInferencias?: number;
    inferenciasUsadas?: number;
    inferenciasDisponibles?: number;
    cuotaAgotada?: boolean;
    fechaReinicioCuota?: string;
    limiteHistorial?: number;
    historialUsado?: number;
    historialDisponibles?: number;
    historialLleno?: boolean;
  };
  kpis: {
    maePromedio?: number | null;
    calificacionPromedio?: number | null;
    costoPromedioKg?: number | null;
    costoPromedioKgBloqueado?: boolean;
    costoPromedioKgPlanRequerido?: string;
    exportacionesMes?: number | null;
    exportacionesMesBloqueado?: boolean;
    exportacionesMesPlanRequerido?: string;
    sesionesEstacionalidadPct?: number | null;
    sesionesEstacionalidadBloqueado?: boolean;
    sesionesEstacionalidadPlanRequerido?: string;
    exportacionesPdf?: number | null;
    exportacionesPdfBloqueado?: boolean;
    exportacionesPdfPlanRequerido?: string;
  };
  graficos: {
    inferenciasPorMes: GraficoDashboardDto;
    modosOptimizacion: GraficoDashboardDto;
    costoHistorial: GraficoDashboardDto;
    exportaciones: GraficoDashboardDto;
    semaforoResumen: GraficoDashboardDto;
  };
  recetasRecientes: {
    id: string;
    nombre?: string;
    fecha?: string;
    modoOptimizacion?: string;
    tituloModo?: string;
    margenErrorMae?: number;
    mostrarCosto?: boolean;
    costoEstimadoKg?: number;
  }[];
  privilegios: {
    verCosto: boolean;
    verExportacion: boolean;
    verEstacionalidad: boolean;
    verSemaforoExtendido: boolean;
    verExportacionPdf: boolean;
  };
};

@Injectable({ providedIn: 'root' })
export class UsuarioDashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl + '/usuario/dashboard';

  obtenerDashboard(): Observable<UsuarioDashboardDto> {
    return this.http.get<UsuarioDashboardDto>(this.api);
  }
}
