import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <button
      type="button"
      (click)="onToggle()"
      [ngClass]="buttonClass"
      [attr.aria-label]="useSolIcon ? 'Activar modo claro' : 'Activar modo oscuro'"
      [attr.title]="useSolIcon ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-800 dark:ring dark:ring-dark-border">
        <ng-icon
          [name]="useSolIcon ? 'heroSun' : 'heroMoon'"
          size="22"
          class="text-primary"
        />
      </span>
    </button>
  `,
})
export class ThemeToggleComponent implements OnInit {
  @Input() mode: 'fab' | 'inline' = 'fab';
  useSolIcon = false;

  get buttonClass(): string {
    const base =
      'shadow-md ring-2 ring-black/10 transition hover:opacity-90 dark:ring-white/20 dark:shadow-none';
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
