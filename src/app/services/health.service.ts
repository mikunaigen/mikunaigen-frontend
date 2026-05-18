import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment'; 

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private apiUrl = environment.apiUrl + '/estado_bases_datos';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
