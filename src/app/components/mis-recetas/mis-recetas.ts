import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../services/auth.service';
import {
  FormulacionInferenciaService,
  HistorialRecetaDto,
} from '../../services/formulacion-inferencia.service';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-mis-recetas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    CompradorNavComponent,
    LogoutButtonComponent,
  ],
  templateUrl: './mis-recetas.component.html',
})
export class MisRecetasComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly inferenciaService = inject(FormulacionInferenciaService);

  lista = signal<HistorialRecetaDto[]>([]);
  cargando = signal(true);
  busquedaTexto = '';
  historialBloqueadoPorPlan = false;
  limiteHistorial = 0;
  historialUsado = 0;
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);
  confirmarEliminar = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/mis-recetas' } });
      return;
    }
    if (this.auth.esAdministrador() || !this.auth.esUsuarioFormulacion()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.cargar();
    this.inferenciaService.preparacion().subscribe({
      next: (p) => {
        this.historialBloqueadoPorPlan = !!p.cuota?.historialBloqueadoPorPlan;
        this.limiteHistorial = p.cuota?.limiteHistorial ?? 0;
        this.historialUsado = p.cuota?.historialUsado ?? 0;
      },
    });
  }

  historialBloqueado(): boolean {
    return this.historialBloqueadoPorPlan;
  }

  cargar(): void {
    this.cargando.set(true);
    this.inferenciaService.listarHistorial(this.busquedaTexto).subscribe({
      next: (items) => {
        this.lista.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.modal.set({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo cargar el historial.' });
      },
    });
  }

  buscar(): void {
    this.cargar();
  }

  abrirReceta(id: string): void {
    void this.router.navigate(['/formular'], { queryParams: { recetaId: id } });
  }

  solicitarEliminar(id: string): void {
    this.confirmarEliminar.set(id);
  }

  eliminar(): void {
    const id = this.confirmarEliminar();
    if (!id) return;
    this.inferenciaService.eliminarHistorial(id).subscribe({
      next: (res) => {
        this.confirmarEliminar.set(null);
        this.modal.set({ tipo: 'ok', titulo: 'Eliminada', mensaje: res.message });
        this.cargar();
        this.inferenciaService.preparacion().subscribe({
          next: (p) => {
            this.historialBloqueadoPorPlan = !!p.cuota?.historialBloqueadoPorPlan;
            this.limiteHistorial = p.cuota?.limiteHistorial ?? 0;
            this.historialUsado = p.cuota?.historialUsado ?? 0;
          },
        });
      },
      error: (err) => {
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo eliminar la receta.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }
}
