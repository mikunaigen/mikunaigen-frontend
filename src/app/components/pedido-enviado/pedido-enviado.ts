import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-pedido-enviado',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutButtonComponent],
  templateUrl: './pedido-enviado.component.html',
})
export class PedidoEnviadoComponent {}
