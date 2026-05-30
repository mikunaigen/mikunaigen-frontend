import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-comprador-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './comprador-nav.component.html',
})
export class CompradorNavComponent implements OnInit, OnDestroy {
  @Input() variant: 'primary' | 'secondary' = 'primary';

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private routerSub?: Subscription;

  rutaPanelTrabajo: string | null = null;
  esAdmin = false;
  mostrarInicio = true;
  mostrarFormular = false;
  mostrarMisRecetas = false;
  mostrarMiPerfil = true;
  mostrarPanelTrabajo = false;
  mostrarObjetivoNutricional = false;
  mostrarParametrizacion = false;

  ngOnInit(): void {
    this.rutaPanelTrabajo = this.auth.getWorkPanelPath();
    this.actualizarVisibilidad();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.actualizarVisibilidad());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  claseEnlace(): string {
    if (this.variant === 'secondary') {
      return 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25 sm:w-max';
    }
    return 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-dark-border dark:bg-slate-900 dark:text-dark-text-strong dark:shadow-none dark:hover:bg-slate-800 sm:w-max';
  }

  private actualizarVisibilidad(): void {
    const actual = this.router.url.split('?')[0];
    this.esAdmin = this.auth.esAdministrador();
    this.mostrarInicio = !this.esAdmin && actual !== '/usuario-home';
    this.mostrarFormular = this.auth.esUsuarioFormulacion() && actual !== '/formular';
    this.mostrarMisRecetas = this.auth.esUsuarioFormulacion() && actual !== '/mis-recetas';
    this.mostrarMiPerfil = actual !== '/mi-perfil';
    this.mostrarPanelTrabajo =
      !!this.rutaPanelTrabajo && actual !== this.rutaPanelTrabajo;
    this.mostrarObjetivoNutricional =
      this.auth.esUsuarioFormulacion() && actual !== '/objetivo-nutricional';
    this.mostrarParametrizacion =
      this.auth.esUsuarioFormulacion() && actual !== '/parametrizacion';
  }
}
