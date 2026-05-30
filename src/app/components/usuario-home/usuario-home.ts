import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { UsuarioDashboardSeccionComponent } from '../usuario-dashboard-seccion/usuario-dashboard-seccion';
import { UsuarioPlanSeccionComponent } from '../usuario-plan-seccion/usuario-plan-seccion';

@Component({
  selector: 'app-usuario-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutButtonComponent,
    CompradorNavComponent,
    UsuarioDashboardSeccionComponent,
    UsuarioPlanSeccionComponent,
  ],
  templateUrl: './usuario-home.component.html',
})
export class UsuarioHomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login']);
      return;
    }
    const rol = this.auth.getSession()?.role;
    if (this.auth.esAdministrador(rol)) {
      void this.router.navigate(['/gestion-administrador']);
    }
  }
}
