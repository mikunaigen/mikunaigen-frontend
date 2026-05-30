import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import {
  etiquetaPlanRequerido,
  mensajePlanRequerido,
  scrollACambiarPlan,
} from '../../../utils/plan-privilegios.util';

@Component({
  selector: 'app-contenido-bloqueado-plan',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './contenido-bloqueado-plan.component.html',
})
export class ContenidoBloqueadoPlanComponent {
  @Input({ required: true }) bloqueado = false;
  @Input() planRequerido: string | null | undefined = null;
  @Input() mensaje = '';

  textoOverlay(): string {
    if (this.mensaje) {
      return this.mensaje;
    }
    return mensajePlanRequerido(this.planRequerido);
  }

  nombrePlan(): string {
    return etiquetaPlanRequerido(this.planRequerido);
  }

  irACambiarPlan(): void {
    scrollACambiarPlan();
  }
}
