import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <button
      type="button"
      (click)="cerrarSesion()"
      [ngClass]="
        variant === 'on-dark'
          ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
          : 'border-gray-300 bg-white text-secondary hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-blue-300 dark:hover:bg-slate-800'
      "
      class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition sm:w-max dark:shadow-none"
    >
      <span class="rb-logo-chip !p-1" *ngIf="variant === 'on-light'">
        <ng-icon name="heroArrowRightOnRectangle" size="16" />
      </span>
      <ng-icon
        *ngIf="variant === 'on-dark'"
        name="heroArrowRightOnRectangle"
        size="16"
        class="text-white"
      />
      Cerrar sesión
    </button>
  `,
})
export class LogoutButtonComponent {
  @Input() variant: 'on-dark' | 'on-light' = 'on-light';

  constructor(
    private auth: AuthService,
    private router: Router,
    private theme: ThemeService,
  ) {}

  cerrarSesion(): void {
    this.auth.clearSession();
    this.theme.onLogout();
    void this.router.navigate(['/presentacion']);
  }
}
