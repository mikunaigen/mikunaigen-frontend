import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';

@Component({
  selector: 'app-gestion-administrador',
  standalone: true,
  imports: [RouterModule, LogoutButtonComponent, CompradorNavComponent],
  templateUrl: './gestion-administrador.component.html',
  styleUrl: './gestion-administrador.css',
})
export class GestionAdministradorComponent {}
