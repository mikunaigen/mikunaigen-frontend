import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment'; 

export type IpStatusDto = {
  blocked: boolean;
  ipAddress: string;
  remainingSeconds: number;
};

@Injectable({ providedIn: 'root' })
export class IpStatusService {
  private apiUrl = environment.apiUrl + '/auth';

  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<IpStatusDto> {
    return this.http.get<IpStatusDto>(`${this.apiUrl}/ip-status`);
  }
}

