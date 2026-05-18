import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="onToggle()"
      [ngClass]="buttonClass"
      [attr.aria-label]="useSolIcon ? 'Activar modo claro' : 'Activar modo oscuro'"
      [attr.title]="useSolIcon ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      <img
        [src]="useSolIcon ? '/iconos/switch-sol.png' : '/iconos/switch-luna.png'"
        alt=""
        width="36"
        height="36"
        class="h-9 w-9 object-contain"
      />
    </button>
  `,
})
export class ThemeToggleComponent implements OnInit {
  @Input() mode: 'fab' | 'inline' = 'fab';
  useSolIcon = false;

  get buttonClass(): string {
    const base =
      'rb-logo-chip shadow-md ring-2 ring-black/10 transition hover:opacity-90 dark:ring-white/20';
    return this.mode === 'inline'
      ? `${base} inline-flex shrink-0`
      : `${base} fixed bottom-4 right-4 z-[45]`;
  }

  constructor(private readonly theme: ThemeService) {}

  ngOnInit(): void {
    this.useSolIcon = this.theme.isDark();
  }

  onToggle(): void {
    this.theme.toggle();
    this.useSolIcon = this.theme.isDark();
  }
}
