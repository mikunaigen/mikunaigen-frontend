import { Component, Input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { LOGO_MARCA } from './iconos-ui';

@Component({
  selector: 'rb-logo-marca',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div
      class="flex items-center justify-center rounded-full bg-white shadow-sm dark:shadow-none"
      [class]="tamanoClases"
    >
      <ng-icon [name]="icono" [size]="iconoTamano" class="text-primary" />
    </div>
  `,
})
export class RbLogoMarcaComponent {
  @Input() tamano: 'sm' | 'md' | 'lg' = 'md';
  icono = LOGO_MARCA;

  get tamanoClases(): string {
    if (this.tamano === 'sm') return 'h-10 w-10 sm:h-11 sm:w-11';
    if (this.tamano === 'lg') return 'h-14 w-14 sm:h-16 sm:w-16';
    return 'h-12 w-12 sm:h-14 sm:w-14';
  }

  get iconoTamano(): string {
    if (this.tamano === 'sm') return '24';
    if (this.tamano === 'lg') return '36';
    return '28';
  }
}
