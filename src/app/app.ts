import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HealthService } from './services/health.service';
import { BackendStatusService } from './services/backend-status.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { AuthService } from './services/auth.service';
import { WebsocketService } from './services/websocket.service';
import { MaintenanceService } from './services/maintenance.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ThemeToggleComponent, NgIconComponent],
  template: `
    <div class="rb-mesh-bg" aria-hidden="true">
      <div class="rb-mesh-bg__stage">
        <span class="rb-mesh-blob rb-mesh-blob--1"></span>
        <span class="rb-mesh-blob rb-mesh-blob--2"></span>
        <span class="rb-mesh-blob rb-mesh-blob--3"></span>
        <span class="rb-mesh-blob rb-mesh-blob--4"></span>
        <span class="rb-mesh-blob rb-mesh-blob--5"></span>
      </div>
    </div>
    <div class="rb-app-content">
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
          <ng-icon name="heroCog6Tooth" size="48" class="text-secondary dark:text-blue-400" />
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
            <ng-icon name="heroInformationCircle" size="20" class="shrink-0 text-secondary dark:text-blue-400" />
            Conectando...
          </span>
          <span class="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 sm:text-sm dark:text-slate-400">
            <ng-icon name="heroSparkles" size="18" class="shrink-0 opacity-90 text-secondary dark:text-blue-400" />
            Por favor espere.
          </span>
        </p>
      </div>
    </div>
    <div *ngIf="emailEnvioModal" class="rb-modal-backdrop z-[90]">
      <div class="rb-modal max-w-sm border-gray-200 dark:border-dark-border">
        <div class="rb-modal-icon !mb-6">
          <ng-icon name="heroXCircle" size="48" class="text-danger" />
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
          <ng-icon name="heroCog6Tooth" size="48" class="text-secondary dark:text-blue-400" />
        </div>
        <h3 class="mb-3 text-lg font-semibold text-gray-900 sm:text-xl dark:text-dark-text-strong">
          {{ maintenance.title() }}
        </h3>
        <p class="text-sm font-medium text-neutral-strong dark:text-dark-text-muted lg:text-base">
          {{ maintenance.message() }}
        </p>
      </div>
    </div>
    <div *ngIf="cuentaSuspendidaModal" class="rb-modal-backdrop z-[120]">
      <div class="rb-modal max-w-md border-gray-200 text-center dark:border-dark-border">
        <div class="rb-modal-icon !mb-4">
          <ng-icon name="heroExclamationTriangle" size="48" class="text-warning" />
        </div>
        <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-dark-text-strong">
          Cuenta suspendida
        </h3>
        <p class="mb-8 text-sm text-neutral-strong dark:text-dark-text-muted">
          {{ cuentaSuspendidaMsg }}
        </p>
        <button type="button" (click)="cerrarSesionPorSuspension()" class="rb-btn-danger w-full min-h-11 sm:w-max">
          <span class="inline-flex items-center justify-center gap-2">
            <ng-icon name="heroArrowRightOnRectangle" size="18" />
            Cerrar sesión
          </span>
        </button>
      </div>
    </div>
    <div *ngIf="entradaInvalidaModal" class="rb-modal-backdrop">
      <div class="rb-modal max-w-sm border-gray-200 dark:border-dark-border">
        <div class="rb-modal-icon !mb-6">
          <ng-icon name="heroExclamationTriangle" size="48" class="text-warning" />
        </div>
        <h3 class="mb-8 text-lg font-semibold text-gray-900 sm:text-xl dark:text-dark-text-strong">
          Esta entrada no es válida
        </h3>
        <div class="flex justify-center">
          <button type="button" (click)="cerrarEntradaInvalida()" class="rb-btn-secondary">Aceptar</button>
        </div>
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
  cuentaSuspendidaModal = false;
  cuentaSuspendidaMsg =
    'Tu cuenta ha sido suspendida por el administrador. Debes cerrar sesión para continuar.';

  hideThemeFab = false;

  private readonly patroScript = /script/i;

  private readonly onDocumentInput = (event: Event) => this.validarEntradaGlobal(event);

  private navSub?: Subscription;
  private wsEmailSub?: Subscription;
  private wsSystemSub?: Subscription;
  private wsCuentaSub?: Subscription;
  private wsCuentaUserId: string | null = null;

  constructor(
    private healthService: HealthService,
    private router: Router,
    readonly backendStatus: BackendStatusService,
    private authService: AuthService,
    private websocketService: WebsocketService,
    readonly maintenance: MaintenanceService,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    this.refreshHideThemeFab();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.refreshHideThemeFab();
        this.iniciarEscuchaCuenta();
      });
    this.iniciarEscuchaCuenta();

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
    this.wsCuentaSub?.unsubscribe();
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

  cerrarSesionPorSuspension(): void {
    this.cuentaSuspendidaModal = false;
    this.authService.clearSession();
    this.theme.onLogout();
    this.wsCuentaSub?.unsubscribe();
    this.wsCuentaUserId = null;
    void this.router.navigate(['/login'], {
      queryParams: { suspendido: '1' },
    });
  }

  private iniciarEscuchaCuenta(): void {
    const s = this.authService.getSession();
    if (!s?.userId || !this.authService.isLoggedIn()) {
      this.wsCuentaSub?.unsubscribe();
      this.wsCuentaSub = undefined;
      this.wsCuentaUserId = null;
      return;
    }
    if (this.wsCuentaUserId === s.userId && this.wsCuentaSub) {
      return;
    }
    this.wsCuentaSub?.unsubscribe();
    this.wsCuentaUserId = s.userId;
    this.wsCuentaSub = this.websocketService
      .subscribeToTopic(`/topic/cuenta/usuario/${s.userId}`)
      .subscribe((raw) => this.procesarEventoCuenta(raw));
  }

  private procesarEventoCuenta(raw: string): void {
    try {
      const o = JSON.parse(raw) as { tipo?: string; message?: string };
      if (o.tipo === 'cuenta_suspendida') {
        this.cuentaSuspendidaMsg =
          o.message ||
          'Tu cuenta ha sido suspendida por el administrador. Debes cerrar sesión para continuar.';
        this.cuentaSuspendidaModal = true;
      }
    } catch {
      return;
    }
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
