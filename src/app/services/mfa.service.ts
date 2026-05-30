import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type MfaEstadoDto = {
  mfaEnabled: boolean;
  pendingSetup: boolean;
};

export type MfaIniciarDto = {
  otpAuthUri: string;
  secretPlain: string;
  email: string;
};

export type MfaConfirmarDto = {
  message: string;
  mfaEnabled: boolean;
  backupCodes: string[];
};

export type MfaDesactivarPayload = {
  password: string;
  code: string;
};

@Injectable({ providedIn: 'root' })
export class MfaService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/perfil/me/mfa';

  estado(): Observable<MfaEstadoDto> {
    return this.http.get<MfaEstadoDto>(`${this.base}/estado`);
  }

  iniciar(): Observable<MfaIniciarDto> {
    return this.http.post<MfaIniciarDto>(`${this.base}/iniciar`, {});
  }

  confirmar(code: string): Observable<MfaConfirmarDto> {
    return this.http.post<MfaConfirmarDto>(`${this.base}/confirmar`, { code });
  }

  desactivar(payload: MfaDesactivarPayload): Observable<{ message: string; mfaEnabled: boolean }> {
    return this.http.post<{ message: string; mfaEnabled: boolean }>(`${this.base}/desactivar`, payload);
  }

  verificarLogin(payload: {
    mfaToken: string;
    code?: string;
    backupCode?: string;
  }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${environment.apiUrl}/auth/mfa/verificar-login`,
      payload,
    );
  }
}
