import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment';

const API_KPIS = environment.apiUrl + '/admin/dashboard/kpis';

export interface KpiItem {
  nombre: string;
  valor: string;
  formula: string;
  tendencia: 'up' | 'down' | string;
}

export interface KpisRespuesta {
  desde?: string;
  hasta?: string;
  kpis: KpiItem[];
  alertaPrecision?: boolean;
  alertaTiempoRespuesta?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  fromDate = '';
  toDate = '';
  cargando = false;
  errorMsg = '';
  datos: KpisRespuesta | null = null;

  ngOnInit(): void {
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);
    this.toDate = this.toYmd(hoy);
    this.fromDate = this.toYmd(hace30);
    this.cargar();
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  cargar(): void {
    if (!this.fromDate || !this.toDate) return;
    this.cargando = true;
    this.errorMsg = '';
    const params = new HttpParams()
      .set('desde', `${this.fromDate}T00:00:00`)
      .set('hasta', `${this.toDate}T23:59:59`);
    this.http.get<KpisRespuesta>(API_KPIS, { params }).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los indicadores.';
        this.cargando = false;
      },
    });
  }

  iconoTendencia(t: string): string {
    return t === 'down' ? 'heroArrowTrendingDown' : 'heroArrowTrendingUp';
  }

  claseTendencia(t: string): string {
    if (t === 'down') return 'text-danger';
    return 'text-success';
  }

  trackKpi(_: number, k: KpiItem): string {
    return k.nombre;
  }
}
