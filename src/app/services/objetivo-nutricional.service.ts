import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ObjetivoNutricionalValores } from '../data/objetivo-nutricional-campos';

const STORAGE_KEY = 'mikunaigen_objetivo_nutricional';

export type ValidarObjetivoResponse = {
  valido: boolean;
  message: string;
  errores?: Record<string, string>;
  valores?: ObjetivoNutricionalValores;
};

@Injectable({ providedIn: 'root' })
export class ObjetivoNutricionalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/formulacion/objetivo-nutricional`;

  validar(valores: ObjetivoNutricionalValores): Observable<ValidarObjetivoResponse> {
    return this.http.post<ValidarObjetivoResponse>(`${this.base}/validar`, valores);
  }

  guardarSesion(valores: ObjetivoNutricionalValores): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(valores));
  }

  leerSesion(): ObjetivoNutricionalValores | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ObjetivoNutricionalValores;
    } catch {
      return null;
    }
  }
}
