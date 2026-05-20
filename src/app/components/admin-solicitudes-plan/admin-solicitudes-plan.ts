import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import {
  PlanUsuarioService,
  SolicitudAdminItem,
  topicPlanesAdmin,
} from '../../services/plan-usuario.service';
import { AdminUsuarioService, UsuarioAdminItem } from '../../services/admin-usuario.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { ImagenPreviewComponent } from '../shared/imagen-preview/imagen-preview';

type Pestana = 'usuarios' | 'solicitudes';

type Confirmacion = {
  titulo: string;
  mensaje: string;
  accion: 'renovar' | 'desactivar' | 'reactivar' | 'aprobar' | 'rechazar';
  usuario?: UsuarioAdminItem;
  solicitudId?: number;
};

@Component({
  selector: 'app-admin-solicitudes-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, LogoutButtonComponent, ImagenPreviewComponent],
  templateUrl: './admin-solicitudes-plan.component.html',
})
export class AdminSolicitudesPlanComponent implements OnInit, OnDestroy {
  private readonly planService = inject(PlanUsuarioService);
  private readonly adminUsuarioService = inject(AdminUsuarioService);
  private readonly websocket = inject(WebsocketService);

  private wsSub?: Subscription;

  pestanaActiva: Pestana = 'usuarios';

  cargandoUsuarios = signal(true);
  usuarios = signal<UsuarioAdminItem[]>([]);
  filtroBusqueda = '';
  filtroRol = '';
  filtroPlan = '';
  usuarioExpandido = signal<string | null>(null);

  cargando = signal(true);
  solicitudes = signal<SolicitudAdminItem[]>([]);
  filtro = 'pendiente';
  motivoRechazo = '';
  seleccionada = signal<SolicitudAdminItem | null>(null);

  confirmacion = signal<Confirmacion | null>(null);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  comprobanteUrls = signal<Record<number, string>>({});
  comprobanteCargando = signal<Record<number, boolean>>({});

  private readonly urlsRevocar = new Set<string>();

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarSolicitudes();
    this.wsSub = this.websocket.subscribeToTopic(topicPlanesAdmin()).subscribe(() => {
      this.cargarUsuarios(true);
      this.cargarSolicitudes(true);
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    for (const url of this.urlsRevocar) {
      URL.revokeObjectURL(url);
    }
    this.urlsRevocar.clear();
  }

  cambiarPestana(p: Pestana): void {
    this.pestanaActiva = p;
  }

  cargarUsuarios(silencioso = false): void {
    if (!silencioso) {
      this.cargandoUsuarios.set(true);
    }
    this.adminUsuarioService
      .listar({
        busqueda: this.filtroBusqueda,
        rol: this.filtroRol,
        plan: this.filtroPlan,
      })
      .subscribe({
        next: (res) => {
          this.cargandoUsuarios.set(false);
          this.usuarios.set(res.usuarios ?? []);
        },
        error: (err) => {
          this.cargandoUsuarios.set(false);
          this.mostrarError(err?.error?.message || 'No se pudieron cargar los usuarios.');
        },
      });
  }

  cargarSolicitudes(silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    const urlsPrevias = { ...this.comprobanteUrls() };
    this.planService.listarSolicitudesAdmin(this.filtro || undefined).subscribe({
      next: (res) => {
        this.cargando.set(false);
        const lista = res.solicitudes ?? [];
        this.solicitudes.set(lista);
        const idsActuales = new Set(lista.map((s) => s.id));
        for (const [idStr, url] of Object.entries(urlsPrevias)) {
          const id = Number(idStr);
          if (!idsActuales.has(id)) {
            URL.revokeObjectURL(url);
            this.urlsRevocar.delete(url);
            delete urlsPrevias[id];
          }
        }
        this.comprobanteUrls.set(urlsPrevias);
        for (const s of lista) {
          if (s.tieneComprobante && !this.comprobanteUrls()[s.id]) {
            this.cargarComprobante(s.id);
          }
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarError(err?.error?.message || 'No se pudieron cargar las solicitudes.');
      },
    });
  }

  toggleExpandirUsuario(u: UsuarioAdminItem): void {
    const id = u.id;
    if (this.usuarioExpandido() === id) {
      this.usuarioExpandido.set(null);
      return;
    }
    this.usuarioExpandido.set(id);
    const sol = u.solicitudPendiente;
    if (sol?.tieneComprobante && sol.id) {
      this.cargarComprobante(sol.id);
    }
  }

  solicitarRenovacion(u: UsuarioAdminItem): void {
    this.confirmacion.set({
      titulo: 'Registrar renovación',
      mensaje: `¿Confirmas extender 30 días la suscripción de ${u.nombre || u.email}?`,
      accion: 'renovar',
      usuario: u,
    });
  }

  solicitarDesactivar(u: UsuarioAdminItem): void {
    this.confirmacion.set({
      titulo: 'Desactivar cuenta',
      mensaje: `¿Desactivar la cuenta de ${u.nombre || u.email}? El usuario no podrá iniciar sesión.`,
      accion: 'desactivar',
      usuario: u,
    });
  }

  solicitarReactivar(u: UsuarioAdminItem): void {
    this.confirmacion.set({
      titulo: 'Reactivar cuenta',
      mensaje: `¿Reactivar la cuenta de ${u.nombre || u.email}?`,
      accion: 'reactivar',
      usuario: u,
    });
  }

  solicitarAprobar(u: UsuarioAdminItem): void {
    const id = u.solicitudPendiente?.id;
    if (!id) return;
    this.confirmacion.set({
      titulo: 'Aprobar solicitud',
      mensaje: `¿Aprobar el cambio de plan a ${u.solicitudPendiente?.rolSolicitado} para ${u.nombre || u.email}?`,
      accion: 'aprobar',
      usuario: u,
      solicitudId: id,
    });
  }

  solicitarRechazoUsuario(u: UsuarioAdminItem): void {
    const id = u.solicitudPendiente?.id;
    if (!id) return;
    this.seleccionada.set({
      id,
      estado: 'pendiente',
      usuarioNombre: u.nombre,
      usuarioEmail: u.email,
      rolSolicitado: u.solicitudPendiente?.rolSolicitado,
    });
    this.motivoRechazo = '';
  }

  abrirRechazo(s: SolicitudAdminItem): void {
    this.seleccionada.set(s);
    this.motivoRechazo = '';
  }

  cancelarConfirmacion(): void {
    this.confirmacion.set(null);
  }

  ejecutarConfirmacion(): void {
    const c = this.confirmacion();
    if (!c) return;

    switch (c.accion) {
      case 'renovar':
        if (c.usuario) this.ejecutarRenovacion(c.usuario);
        break;
      case 'desactivar':
        if (c.usuario) this.ejecutarDesactivar(c.usuario);
        break;
      case 'reactivar':
        if (c.usuario) this.ejecutarReactivar(c.usuario);
        break;
      case 'aprobar':
        if (c.solicitudId) this.ejecutarAprobar(c.solicitudId);
        break;
    }
  }

  private ejecutarRenovacion(u: UsuarioAdminItem): void {
    this.confirmacion.set(null);
    this.adminUsuarioService.renovarSuscripcion(u.id).subscribe({
      next: (res) => {
        this.modal.set({ tipo: 'ok', titulo: 'Renovación registrada', mensaje: res.message });
        this.cargarUsuarios(true);
      },
      error: (err) => this.mostrarError(err?.error?.message || 'No se pudo registrar la renovación.'),
    });
  }

  private ejecutarDesactivar(u: UsuarioAdminItem): void {
    this.confirmacion.set(null);
    this.adminUsuarioService.desactivar(u.id).subscribe({
      next: (res) => {
        this.modal.set({ tipo: 'ok', titulo: 'Cuenta desactivada', mensaje: res.message });
        this.cargarUsuarios(true);
      },
      error: (err) => this.mostrarError(err?.error?.message || 'No se pudo desactivar la cuenta.'),
    });
  }

  private ejecutarReactivar(u: UsuarioAdminItem): void {
    this.confirmacion.set(null);
    this.adminUsuarioService.reactivar(u.id).subscribe({
      next: (res) => {
        this.modal.set({ tipo: 'ok', titulo: 'Cuenta reactivada', mensaje: res.message });
        this.cargarUsuarios(true);
      },
      error: (err) => this.mostrarError(err?.error?.message || 'No se pudo reactivar la cuenta.'),
    });
  }

  private ejecutarAprobar(solicitudId: number): void {
    this.confirmacion.set(null);
    this.planService.aprobar(solicitudId).subscribe({
      next: (res) => {
        this.modal.set({ tipo: 'ok', titulo: 'Aprobada', mensaje: res.message });
        this.cargarUsuarios(true);
        this.cargarSolicitudes(true);
        this.usuarioExpandido.set(null);
      },
      error: (err) => this.mostrarError(err?.error?.message || 'No se pudo aprobar.'),
    });
  }

  aprobar(s: SolicitudAdminItem): void {
    this.confirmacion.set({
      titulo: 'Aprobar solicitud',
      mensaje: `¿Aprobar el plan ${s.rolSolicitado} para ${s.usuarioNombre || s.usuarioEmail}?`,
      accion: 'aprobar',
      solicitudId: s.id,
    });
  }

  confirmarRechazo(): void {
    const s = this.seleccionada();
    if (!s) return;
    const motivo = this.motivoRechazo.trim();
    if (!motivo) {
      this.mostrarError('Indica el motivo del rechazo.');
      return;
    }
    this.planService.rechazar(s.id, motivo).subscribe({
      next: (res) => {
        this.seleccionada.set(null);
        this.modal.set({ tipo: 'ok', titulo: 'Rechazada', mensaje: res.message });
        this.cargarUsuarios(true);
        this.cargarSolicitudes(true);
        this.usuarioExpandido.set(null);
      },
      error: (err) => this.mostrarError(err?.error?.message || 'No se pudo rechazar.'),
    });
  }

  urlComprobante(id: number): string | null {
    return this.comprobanteUrls()[id] ?? null;
  }

  estaCargandoComprobante(id: number): boolean {
    return !!this.comprobanteCargando()[id];
  }

  cargarComprobante(id: number): void {
    if (this.comprobanteUrls()[id] || this.comprobanteCargando()[id]) {
      return;
    }
    this.comprobanteCargando.update((m) => ({ ...m, [id]: true }));
    this.planService.obtenerComprobante(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.urlsRevocar.add(url);
        this.comprobanteUrls.update((m) => ({ ...m, [id]: url }));
        this.comprobanteCargando.update((m) => ({ ...m, [id]: false }));
      },
      error: () => {
        this.comprobanteCargando.update((m) => ({ ...m, [id]: false }));
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  private mostrarError(mensaje: string): void {
    this.modal.set({ tipo: 'error', titulo: 'Error', mensaje });
  }

  etiquetaEstado(estado?: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
    };
    return map[(estado || '').toLowerCase()] || estado || '—';
  }

  contarSolicitudesPendientes(): number {
    return this.usuarios().filter((u) => u.solicitudPendiente).length;
  }
}
