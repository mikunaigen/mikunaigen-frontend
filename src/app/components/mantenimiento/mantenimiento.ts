import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { MaintenanceService } from '../../services/maintenance.service';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="rb-page">
      <div class="rb-container">
        <div class="rb-card overflow-hidden">
          <div class="border-b border-white/10 bg-secondary px-4 py-6 text-white dark:bg-slate-800 sm:px-6 sm:py-7 lg:px-8">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white sm:h-12 sm:w-12">
                <ng-icon name="heroCog6Tooth" size="28" class="text-secondary" />
              </div>
              <div>
                <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">En mantenimiento</h2>
                <p class="mt-1 text-sm text-white/80">Restauración de datos en curso</p>
              </div>
            </div>
          </div>
          <div class="p-4 sm:p-6 lg:p-8">
            <section class="rb-section-muted">
              <div class="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-dark-border dark:bg-dark-surface sm:p-8">
                <div class="rb-modal-icon !mb-0 animate-pulse">
                  <ng-icon name="heroCog6Tooth" size="48" class="text-secondary dark:text-blue-400" />
                </div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-dark-text-strong sm:text-lg">
                  {{ maintenance.title() }}
                </h3>
                <p class="max-w-md text-sm font-medium text-neutral-strong dark:text-dark-text-muted sm:text-base">
                  {{ maintenance.message() }}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MantenimientoComponent {
  constructor(readonly maintenance: MaintenanceService) {
    this.maintenance.start();
  }
}
