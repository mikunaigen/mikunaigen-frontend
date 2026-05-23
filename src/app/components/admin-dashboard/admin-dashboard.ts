import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment';
import { IaConfigService } from '../../services/ia-config.service';

const API_KPIS = environment.apiUrl + '/admin/dashboard/kpis';
const API_PREDICCION = environment.apiUrl + '/admin/dashboard/prediccion-inventario';

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

export interface PrediccionInventarioItem {
  insumo: string;
  stockActual: number;
  prediccion7d: number;
}

export interface PrediccionInventarioRespuesta {
  disponible?: boolean;
  items?: PrediccionInventarioItem[];
  alertasCriticas?: string[];
  heatmap?: Record<string, number>;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly iaConfig = inject(IaConfigService);

  pestanaActiva: 'kpis' | 'prediccion' = 'kpis';
  fromDate = '';
  toDate = '';
  cargando = false;
  errorMsg = '';
  datos: KpisRespuesta | null = null;

  cargandoPrediccion = false;
  errorPrediccion = '';
  prediccion: PrediccionInventarioRespuesta | null = null;

  ngOnInit(): void {
    this.iaConfig.cargar();
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);
    this.toDate = this.toYmd(hoy);
    this.fromDate = this.toYmd(hace30);
    this.cargar();
  }

  get mostrarPestanaPrediccion(): boolean {
    return this.iaConfig.slot3Activo();
  }

  seleccionarPestana(id: 'kpis' | 'prediccion'): void {
    if (id === 'prediccion' && !this.mostrarPestanaPrediccion) {
      return;
    }
    this.pestanaActiva = id;
    if (id === 'prediccion' && !this.prediccion && !this.cargandoPrediccion) {
      this.cargarPrediccion();
    }
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

  cargarPrediccion(): void {
    if (!this.mostrarPestanaPrediccion) {
      this.prediccion = null;
      return;
    }
    this.cargandoPrediccion = true;
    this.errorPrediccion = '';
    this.http.get<PrediccionInventarioRespuesta>(API_PREDICCION).subscribe({
      next: (d) => {
        this.prediccion = d;
        this.cargandoPrediccion = false;
      },
      error: () => {
        this.errorPrediccion = 'No se pudo cargar la predicción de inventario.';
        this.cargandoPrediccion = false;
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
