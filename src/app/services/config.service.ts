import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment'; 

export type ConfiguracionNegocioDto = {
  configuracionCompleta: boolean;
  emailSmtp: string;
  smtpPasswordConfigured: boolean;
  nombreNegocio: string;
  telefonoNegocio: string;
  terminosCondiciones: string;
  logoBase64: string;
  mediosPago: MediosPagoDto;
};

export type TransferenciaBancariaDto = {
  banco: string;
  numeroCuenta: string;
  cci: string;
};

export type MediosPagoDto = {
  yapeActivo: boolean;
  yapeTelefono: string;
  plinActivo: boolean;
  plinTelefono: string;
  transferenciaActiva: boolean;
  transferencias: TransferenciaBancariaDto[];
};

export type MensajeRespuestaDto = { message?: string };
export type EstadoConfiguracionDto = { configuracionCompleta: boolean };

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = environment.apiUrl + '/configuracion';

  constructor(private http: HttpClient) {}

  obtenerConfiguracion(): Observable<ConfiguracionNegocioDto> {
    return this.http.get<ConfiguracionNegocioDto>(this.apiUrl);
  }

  obtenerEstado(): Observable<EstadoConfiguracionDto> {
    return this.http.get<EstadoConfiguracionDto>(`${this.apiUrl}/estado`);
  }

  enviarVerificacion(data: {
    emailSmtp: string;
    passwordSmtp: string;
  }): Observable<MensajeRespuestaDto> {
    return this.http.post<MensajeRespuestaDto>(`${this.apiUrl}/enviar-verificacion`, data);
  }

  validarYGuardar(data: Record<string, unknown>): Observable<{ message?: string; configuracionCompleta?: boolean }> {
    return this.http.post<{ message?: string; configuracionCompleta?: boolean }>(
      `${this.apiUrl}/validar-y-guardar`,
      data,
    );
  }
}
