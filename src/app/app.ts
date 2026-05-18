import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthService } from './services/health.service';
import { BackendStatusService } from './services/backend-status.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { AuthService } from './services/auth.service';
import { WebsocketService } from './services/websocket.service';
import { MaintenanceService } from './services/maintenance.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ThemeToggleComponent],
  template: `
    <router-outlet></router-outlet>
    <app-theme-toggle *ngIf="!hideThemeFab" />
    <div
      *ngIf="backendStatus.isOffline()"
      class="rb-modal-backdrop z-[100] cursor-wait items-start overflow-y-auto pt-[min(15vh,5rem)] sm:items-center sm:pt-0"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        class="rb-modal mx-auto max-w-md border-gray-200/90 px-6 py-8 sm:px-9 sm:py-9 dark:border-dark-border"
      >
        <div class="rb-modal-icon !mb-5 animate-pulse sm:!mb-6">
          <img
            src="/iconos/engranajes.png"
            alt=""
            width="48"
            height="48"
            class="h-11 w-11 object-contain sm:h-12 sm:w-12"
          />
        </div>
        <h3
          class="mb-3 text-base font-semibold text-gray-900 sm:text-lg md:text-xl dark:text-dark-text-strong"
        >
          Estableciendo conexión con el servidor
        </h3>
        <p
          class="mx-auto mb-6 flex max-w-sm flex-col items-center gap-3 text-sm font-medium leading-relaxed text-neutral-strong sm:text-base dark:text-dark-text-muted"
        >
          <span class="inline-flex items-center gap-2">
            <img
              src="/iconos/consulta-informacion-azul.png"
              alt=""
              width="20"
              height="20"
              class="h-5 w-5 shrink-0 object-contain"
            />
            Conectando...
          </span>
          <span class="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 sm:text-sm dark:text-slate-400">
            <img
              src="/iconos/destellos-recomendaciones.png"
              alt=""
              width="18"
              height="18"
              class="h-4 w-4 shrink-0 object-contain opacity-90"
            />
            Estamos conectando automáticamente.
          </span>
        </p>
      </div>
    </div>
    <div *ngIf="emailEnvioModal" class="rb-modal-backdrop z-[90]">
      <div class="rb-modal max-w-sm border-gray-200 dark:border-dark-border">
        <div class="rb-modal-icon !mb-6">
          <img
            src="/iconos/error-rojo.png"
            alt=""
            width="48"
            height="48"
            class="h-12 w-12 object-contain"
          />
        </div>
        <h3 class="mb-3 text-lg font-semibold text-gray-900 sm:text-xl dark:text-dark-text-strong">
          Envío de correo
        </h3>
        <p class="mb-8 text-sm font-medium text-danger dark:text-red-200 lg:text-base">
          {{ emailEnvioMsg }}
        </p>
        <div class="flex justify-center">
          <button type="button" (click)="cerrarEmailEnvio()" class="rb-btn-danger w-full sm:w-max">Entendido</button>
        </div>
      </div>
    </div>
    <div *ngIf="maintenance.active()" class="rb-modal-backdrop z-[110] cursor-wait">
      <div class="rb-modal max-w-md border-gray-200 dark:border-dark-border">
        <div class="rb-modal-icon !mb-6 animate-pulse">
          <img src="/iconos/engranajes.png" alt="" width="48" height="48" class="h-12 w-12 object-contain" />
        </div>
        <h3 class="mb-3 text-lg font-semibold text-gray-900 sm:text-xl dark:text-dark-text-strong">
          {{ maintenance.title() }}
        </h3>
        <p class="text-sm font-medium text-neutral-strong dark:text-dark-text-muted lg:text-base">
          {{ maintenance.message() }}
        </p>
      </div>
    </div>
    <div *ngIf="entradaInvalidaModal" class="rb-modal-backdrop">
      <div class="rb-modal max-w-sm border-gray-200 dark:border-dark-border">
        <div class="rb-modal-icon !mb-6">
          <img
            src="/iconos/advertencia-amarillo.png"
            alt="Advertencia"
            width="48"
            height="48"
            class="h-12 w-12 object-contain"
          />
        </div>
        <h3 class="mb-8 text-lg font-semibold text-gray-900 sm:text-xl dark:text-dark-text-strong">
          Esta entrada no es válida
        </h3>
        <div class="flex justify-center">
          <button type="button" (click)="cerrarEntradaInvalida()" class="rb-btn-secondary">Aceptar</button>
        </div>
      </div>
    </div>
  `,
})
export class App implements OnInit, OnDestroy {
  statusData: any = null;
  entradaInvalidaModal = false;
  emailEnvioModal = false;
  emailEnvioMsg = '';

  hideThemeFab = false;

  private readonly patroScript = /script/i;

  private readonly onDocumentInput = (event: Event) => this.validarEntradaGlobal(event);

  private navSub?: Subscription;
  private wsEmailSub?: Subscription;
  private wsSystemSub?: Subscription;

  constructor(
    private healthService: HealthService,
    private router: Router,
    readonly backendStatus: BackendStatusService,
    private authService: AuthService,
    private websocketService: WebsocketService,
    readonly maintenance: MaintenanceService,
  ) {}

  ngOnInit() {
    this.refreshHideThemeFab();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.refreshHideThemeFab());

    document.addEventListener('input', this.onDocumentInput, true);
    this.healthService.getStatus().subscribe({
      next: (data) => (this.statusData = data),
      error: (err) => {
        console.error('Error conectando al backend:', err);
        this.statusData = {
          postgresql: 'Error de conexión',
          mongodb: 'Error de conexión',
          backend_status: 'Offline',
        };
      },
    });

    this.wsEmailSub = this.websocketService.subscribeToTopic('/topic/auth/status').subscribe((raw) => {
      const s = this.authService.getSession();
      if (!s?.userId) return;
      try {
        const o = JSON.parse(raw) as { userId?: string; kind?: string; message?: string };
        if (o.userId === s.userId && o.kind === 'email_dispatch_failed') {
          this.emailEnvioModal = true;
          this.emailEnvioMsg = o.message || 'No ha sido posible enviar el correo.';
        }
      } catch {
        return;
      }
    });

    this.wsSystemSub = this.websocketService.subscribeToTopic('/topic/system').subscribe((raw) => {
      const msg = String(raw || '').trim();
      if (msg === 'MAINTENANCE_START') {
        this.maintenance.start();
      }
      if (msg === 'MAINTENANCE_END') {
        this.maintenance.end();
        window.location.reload();
      }
    });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    this.wsEmailSub?.unsubscribe();
    this.wsSystemSub?.unsubscribe();
    document.removeEventListener('input', this.onDocumentInput, true);
  }

  private refreshHideThemeFab(): void {
    const path = this.router.url.split('#')[0].split('?')[0];
    this.hideThemeFab = path === '/entregas';
  }

  cerrarEntradaInvalida() {
    this.entradaInvalidaModal = false;
  }

  cerrarEmailEnvio() {
    this.emailEnvioModal = false;
  }

  private validarEntradaGlobal(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.esCampoTexto(el)) return;
    const v = el.value ?? '';
    if (!this.patroScript.test(v)) return;
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    this.entradaInvalidaModal = true;
  }

  private esCampoTexto(el: HTMLInputElement | HTMLTextAreaElement): boolean {
    if (el instanceof HTMLTextAreaElement) return true;
    const t = (el.type || 'text').toLowerCase();
    const excluidos = new Set([
      'checkbox',
      'radio',
      'file',
      'hidden',
      'button',
      'submit',
      'image',
      'range',
      'color',
      'reset',
    ]);
    return !excluidos.has(t);
  }
}