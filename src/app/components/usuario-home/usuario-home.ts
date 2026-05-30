import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  PlanContextoDto,
  PlanDisponible,
  PlanUsuarioService,
  parsePlanWsEvento,
  topicPlanesUsuario,
} from '../../services/plan-usuario.service';
import { WebsocketService } from '../../services/websocket.service';
import { MediosPagoDto } from '../../services/config.service';
import { NgIconComponent } from '@ng-icons/core';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { ImagenPreviewComponent } from '../shared/imagen-preview/imagen-preview';
import {
  obtenerPlanDetalle,
  normalizarCodigoPlan,
  precioMostrarPlan,
  type PlanDetalle,
} from '../../data/plan-detalles';
@Component({
  selector: 'app-usuario-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    LogoutButtonComponent,
    CompradorNavComponent,
    ImagenPreviewComponent,
  ],
  templateUrl: './usuario-home.component.html',
})
export class UsuarioHomeComponent implements OnInit, OnDestroy {
  private readonly planService = inject(PlanUsuarioService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly websocket = inject(WebsocketService);
  private wsSub?: Subscription;

  cargando = signal(true);
  enviando = signal(false);
  contexto = signal<PlanContextoDto | null>(null);

  planSeleccionado = signal<PlanDisponible | null>(null);
  justificacion = '';
  comprobante: File | null = null;
  nombreComprobante = '';
  errorArchivo = '';

  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login']);
      return;
    }
    const rol = this.auth.getSession()?.role;
    if (this.auth.esAdministrador(rol)) {
      void this.router.navigate(['/gestion-administrador']);
      return;
    }
    this.cargarContexto();
    this.iniciarEscuchaPlanes();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  cargarContexto(silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    this.planService.obtenerContexto().subscribe({
      next: (ctx) => {
        this.cargando.set(false);
        this.contexto.set(ctx);
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo cargar la información.',
        });
      },
    });
  }

  seleccionarPlan(plan: PlanDisponible): void {
    this.planSeleccionado.set(plan);
    this.errorArchivo = '';
  }

  cancelarSeleccion(): void {
    this.planSeleccionado.set(null);
    this.justificacion = '';
    this.comprobante = null;
    this.nombreComprobante = '';
    this.errorArchivo = '';
  }

  onComprobanteChange(file: File | null): void {
    this.errorArchivo = '';
    this.comprobante = file;
    this.nombreComprobante = file?.name ?? '';
  }

  onErrorComprobante(mensaje: string): void {
    this.errorArchivo = mensaje;
    this.comprobante = null;
    this.nombreComprobante = '';
  }

  enviarSolicitud(): void {
    const plan = this.planSeleccionado();
    if (!plan) {
      return;
    }
    const just = this.justificacion.trim();
    if (just.length < 20) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Validación',
        mensaje: 'La justificación debe tener al menos 20 caracteres.',
      });
      return;
    }
    if (!this.comprobante) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Validación',
        mensaje: 'Debes adjuntar el comprobante de pago.',
      });
      return;
    }

    this.enviando.set(true);
    this.planService.enviarSolicitud(plan.codigo, just, this.comprobante).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.planSeleccionado.set(null);
        this.justificacion = '';
        this.comprobante = null;
        this.nombreComprobante = '';
        this.modal.set({ tipo: 'ok', titulo: 'Solicitud registrada', mensaje: res.message });
        this.cargarContexto();
      },
      error: (err) => {
        this.enviando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo enviar la solicitud.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  etiquetaRol(rol?: string): string {
    return obtenerPlanDetalle(rol).nombre;
  }

  planActual(rol?: string): PlanDetalle {
    return obtenerPlanDetalle(rol);
  }

  detallePlan(plan: PlanDisponible): PlanDetalle {
    return obtenerPlanDetalle(plan.codigo);
  }

  precioPlan(plan: PlanDisponible): string {
    const det = this.detallePlan(plan);
    return precioMostrarPlan(det, plan.precioFormateado);
  }

  esGratuito(codigo: string): boolean {
    return normalizarCodigoPlan(codigo) === 'estudiante';
  }

  private iniciarEscuchaPlanes(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      return;
    }
    this.wsSub?.unsubscribe();
    this.wsSub = this.websocket.subscribeToTopic(topicPlanesUsuario(uid)).subscribe((raw) => {
      this.procesarEventoPlanes(raw);
    });
  }

  private procesarEventoPlanes(raw: string): void {
    const ev = parsePlanWsEvento(raw);
    if (!ev?.tipo) {
      return;
    }

    const ctx = this.contexto();
    const rolNorm = (ev.rolActual || '').toLowerCase();

    switch (ev.tipo) {
      case 'solicitud_creada':
        if (ctx) {
          this.contexto.set({
            ...ctx,
            solicitudPendiente: ev.solicitudPendiente ?? ctx.solicitudPendiente,
          });
        } else {
          this.cargarContexto(true);
        }
        this.planSeleccionado.set(null);
        break;

      case 'solicitud_aprobada':
        if (ev.rolActual) {
          this.auth.patchSession({ role: ev.rolActual });
        }
        if (ctx) {
          this.contexto.set({
            ...ctx,
            rolActual: ev.rolActual ?? ctx.rolActual,
            solicitudPendiente: null,
            puedeSolicitarCambio: rolNorm === 'estudiante' || rolNorm === 'emprendedor',
          });
        } else {
          this.cargarContexto(true);
        }
        this.planSeleccionado.set(null);
        this.modal.set({
          tipo: 'ok',
          titulo: 'Plan activado',
          mensaje: ev.message || 'Tu plan fue activado correctamente.',
        });
        break;

      case 'solicitud_rechazada':
        if (ctx) {
          this.contexto.set({ ...ctx, solicitudPendiente: null });
        }
        this.planSeleccionado.set(null);
        this.modal.set({
          tipo: 'error',
          titulo: 'Solicitud rechazada',
          mensaje: ev.motivoRechazo
            ? `${ev.message || 'Tu solicitud fue rechazada.'} Motivo: ${ev.motivoRechazo}`
            : ev.message || 'Tu solicitud fue rechazada.',
        });
        break;
    }
  }

  medios(m: MediosPagoDto | undefined): MediosPagoDto {
    return (
      m ?? {
        yapeActivo: false,
        yapeTelefono: '',
        plinActivo: false,
        plinTelefono: '',
        transferenciaActiva: false,
        transferencias: [],
      }
    );
  }
}
