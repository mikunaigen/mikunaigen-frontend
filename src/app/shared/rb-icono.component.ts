import { Component, Input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'rb-icono',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <span
      [class]="contenedorClases"
      [class.flex]="chip"
      [class.items-center]="chip"
      [class.justify-center]="chip"
      [class.rounded-full]="chip"
      [class.bg-gray-100]="chip"
      [class.dark:bg-white]="chip"
    >
      <ng-icon [name]="nombre" [size]="tamano" [class]="clases" />
    </span>
  `,
})
export class RbIconoComponent {
  @Input({ required: true }) nombre!: string;
  @Input() tamano = '20';
  @Input() clases = '';
  @Input() chip = false;
  @Input() contenedorClases = 'inline-flex shrink-0';
}
