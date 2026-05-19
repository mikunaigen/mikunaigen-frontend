import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';

@Component({
  selector: 'app-gestion-administrador',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, LogoutButtonComponent, CompradorNavComponent],
  templateUrl: './gestion-administrador.component.html',
  styleUrl: './gestion-administrador.css',
})
export class GestionAdministradorComponent {}
