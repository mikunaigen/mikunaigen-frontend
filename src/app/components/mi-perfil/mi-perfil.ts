import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { AuthService } from '../../services/auth.service';
import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorNombreApellidoHistoria,
  filtrarSoloDigitos,
  filtrarSoloLetrasYEspacios,
} from '../../utils/form-validators';
import { MfaService } from '../../services/mfa.service';
import { environment } from '@env/environment';
import { parsePlanWsEvento, topicPlanesUsuario } from '../../services/plan-usuario.service';
import { WebsocketService } from '../../services/websocket.service';

type PerfilResponse = {
  userId?: string;
  nombres?: string;
  apellidos?: string;
  fullName?: string;
  phone?: string;
  dni?: string;
  email?: string;
  role?: string;
  solicitudPlanEnRevision?: boolean;
  solicitudPlanRol?: string;
  mfaEnabled?: boolean;
  message?: string;
};

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LogoutButtonComponent,
    NgIconComponent,
  ],
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly websocket = inject(WebsocketService);
  private readonly mfaService = inject(MfaService);
  private readonly apiPerfil = environment.apiUrl + '/perfil';

  private wsSub?: Subscription;

  cargando = signal(true);
  guardando = signal(false);
  enviandoCodigo = signal(false);

  form = {
    nombres: '',
    apellidos: '',
    phone: '',
    dni: '',
    email: '',
    role: '',
  };

  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);
  solicitudPlanEnRevision = signal(false);
  solicitudRolSolicitado = signal('');

  mfaEnabled = signal(false);
  mfaUi = signal<'idle' | 'qr' | 'backup' | 'disable'>('idle');
  mfaCargando = signal(false);
  mfaQrDataUrl = signal('');
  mfaSecretPlain = signal('');
  mfaConfirmCode = signal('');
  mfaBackupCodes = signal<string[]>([]);
  mfaDisablePassword = '';
  mfaDisableCode = '';

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.cargarPerfil();
    this.iniciarEscuchaPlanes();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  esUsuarioFormulacion(): boolean {
    return this.auth.esUsuarioFormulacion();
  }

  esAdministrador(): boolean {
    return this.auth.esAdministrador();
  }

  volver(): void {
    const path = this.auth.getPostLoginPath();
    const queryParams = this.auth.getPostLoginQueryParams();
    void this.router.navigate([path], { queryParams });
  }

  soloLetras(event: Event, campo: 'nombres' | 'apellidos', max?: number): void {
    this.form[campo] = filtrarSoloLetrasYEspacios(event, max);
  }

  etiquetaRol(): string {
    const r = (this.form.role || '').toLowerCase();
    const map: Record<string, string> = {
      estudiante: 'Estudiante',
      emprendedor: 'Emprendedor',
      nutricionista: 'Nutricionista',
      administrador: 'Administrador',
      admin: 'Administrador',
      cliente: 'Estudiante',
    };
    return map[r] || this.form.role || '—';
  }

  guardarCambios(): void {
    const nombres = this.form.nombres.trim();
    const apellidos = this.form.apellidos.trim();

    const errNombres = errorNombreApellidoHistoria(nombres, 'nombres');
    if (errNombres) {
      this.modal.set({ tipo: 'error', titulo: 'Validación', mensaje: errNombres });
      return;
    }

    const errApellidos = errorNombreApellidoHistoria(apellidos, 'apellidos');
    if (errApellidos) {
      this.modal.set({ tipo: 'error', titulo: 'Validación', mensaje: errApellidos });
      return;
    }

    this.guardando.set(true);
    this.http
      .put<PerfilResponse>(`${this.apiPerfil}/me`, {
        nombres,
        apellidos,
      })
      .subscribe({
        next: (resp) => {
          this.guardando.set(false);
          this.aplicarRespuesta(resp);
          this.auth.patchSession({
            fullName: `${nombres} ${apellidos}`.trim(),
          });
          this.modal.set({
            tipo: 'ok',
            titulo: 'Perfil actualizado',
            mensaje: resp.message || 'Datos Actualizados Correctamente',
          });
        },
        error: (err) => {
          this.guardando.set(false);
          this.modal.set({
            tipo: 'error',
            titulo: 'Error',
            mensaje: err?.error?.message || 'No se pudo actualizar tu perfil.',
          });
        },
      });
  }

  cambiarPassword(): void {
    this.enviandoCodigo.set(true);
    this.http.post<{ email: string }>(`${this.apiPerfil}/me/cambiar-password/enviar-codigo`, {}).subscribe({
      next: (resp) => {
        this.enviandoCodigo.set(false);
        void this.router.navigate(['/recuperar'], {
          queryParams: { email: resp?.email || this.form.email, autoSend: '1', locked: '1' },
        });
      },
      error: (err) => {
        this.enviandoCodigo.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Cambiar Contraseña',
          mensaje: err?.error?.message || 'No se pudo enviar el código.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  iniciarMfa(): void {
    this.mfaCargando.set(true);
    this.mfaService.iniciar().subscribe({
      next: async (resp) => {
        this.mfaCargando.set(false);
        this.mfaSecretPlain.set(resp.secretPlain || '');
        try {
          const QRCode = (await import('qrcode')).default;
          const dataUrl = await QRCode.toDataURL(resp.otpAuthUri, {
            width: 220,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          this.mfaQrDataUrl.set(dataUrl);
        } catch {
          this.mfaQrDataUrl.set('');
        }
        this.mfaConfirmCode.set('');
        this.mfaUi.set('qr');
      },
      error: (err) => {
        this.mfaCargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Doble factor',
          mensaje: err?.error?.message || 'No se pudo iniciar la configuración.',
        });
      },
    });
  }

  soloNumerosMfa(event: Event): void {
    this.mfaConfirmCode.set(filtrarSoloDigitos(event, 6));
  }

  bloquearNoNumericoMfa(event: KeyboardEvent): void {
    bloquearTeclasNoNumericas(event);
  }

  soloNumerosDesactivarMfa(event: Event): void {
    this.mfaDisableCode = filtrarSoloDigitos(event, 6);
  }

  confirmarMfa(): void {
    const codErr = errorCodigo6(this.mfaConfirmCode());
    if (codErr) {
      this.modal.set({ tipo: 'error', titulo: 'Doble factor', mensaje: codErr });
      return;
    }
    this.mfaCargando.set(true);
    this.mfaService.confirmar(this.mfaConfirmCode()).subscribe({
      next: (resp) => {
        this.mfaCargando.set(false);
        this.mfaEnabled.set(true);
        this.mfaBackupCodes.set(resp.backupCodes || []);
        this.mfaUi.set('backup');
        this.mfaSecretPlain.set('');
        this.mfaQrDataUrl.set('');
      },
      error: (err) => {
        this.mfaCargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Doble factor',
          mensaje: err?.error?.message || 'Código inválido o expirado.',
        });
      },
    });
  }

  cerrarMfaSetup(): void {
    this.mfaUi.set('idle');
    this.mfaBackupCodes.set([]);
    this.mfaConfirmCode.set('');
    this.mfaQrDataUrl.set('');
    this.mfaSecretPlain.set('');
    this.mfaDisablePassword = '';
    this.mfaDisableCode = '';
  }

  descargarCodigosRespaldo(): void {
    const codes = this.mfaBackupCodes();
    if (!codes.length) {
      return;
    }
    const contenido = [
      'Mikunaigen - Códigos de respaldo MFA',
      `Cuenta: ${this.form.email}`,
      '',
      ...codes.map((c, i) => `${i + 1}. ${c}`),
      '',
      'Cada código solo puede usarse una vez.',
    ].join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mikunaigen-codigos-respaldo-mfa.txt';
    a.click();
    URL.revokeObjectURL(url);
    this.cerrarMfaSetup();
    this.modal.set({
      tipo: 'ok',
      titulo: 'Doble factor activado',
      mensaje: 'La autenticación de doble factor quedó habilitada en tu cuenta.',
    });
  }

  abrirDesactivarMfa(): void {
    this.mfaDisablePassword = '';
    this.mfaDisableCode = '';
    this.mfaUi.set('disable');
  }

  desactivarMfa(): void {
    if (!this.mfaDisablePassword.trim()) {
      this.modal.set({ tipo: 'error', titulo: 'Doble factor', mensaje: 'Ingresa tu contraseña actual.' });
      return;
    }
    const codErr = errorCodigo6(this.mfaDisableCode);
    if (codErr) {
      this.modal.set({ tipo: 'error', titulo: 'Doble factor', mensaje: codErr });
      return;
    }
    this.mfaCargando.set(true);
    this.mfaService
      .desactivar({ password: this.mfaDisablePassword, code: this.mfaDisableCode })
      .subscribe({
        next: () => {
          this.mfaCargando.set(false);
          this.mfaEnabled.set(false);
          this.mfaUi.set('idle');
          this.modal.set({
            tipo: 'ok',
            titulo: 'Doble factor',
            mensaje: 'La autenticación de doble factor fue desactivada.',
          });
        },
        error: (err) => {
          this.mfaCargando.set(false);
          this.modal.set({
            tipo: 'error',
            titulo: 'Doble factor',
            mensaje: err?.error?.message || 'No se pudo desactivar.',
          });
        },
      });
  }

  private cargarPerfil(): void {
    this.cargando.set(true);
    this.http.get<PerfilResponse>(`${this.apiPerfil}/me`).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.aplicarRespuesta(resp);
      },
      error: (err) => {
        this.cargando.set(false);
        if (err?.status === 401) {
          void this.router.navigate(['/login']);
          return;
        }
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudo cargar tu información.',
        });
      },
    });
  }

  private aplicarRespuesta(resp: PerfilResponse): void {
    this.form.nombres = String(resp?.nombres ?? '').trim();
    this.form.apellidos = String(resp?.apellidos ?? '').trim();
    if (!this.form.nombres && resp?.fullName) {
      const partes = String(resp.fullName).trim().split(/\s+/);
      this.form.nombres = partes[0] ?? '';
      this.form.apellidos = partes.slice(1).join(' ');
    }
    this.form.phone = String(resp?.phone || '');
    this.form.dni = String(resp?.dni || '');
    this.form.email = String(resp?.email || '');
    this.form.role = String(resp?.role || '');
    this.solicitudPlanEnRevision.set(!!resp?.solicitudPlanEnRevision);
    this.solicitudRolSolicitado.set(String(resp?.solicitudPlanRol || ''));
    this.mfaEnabled.set(!!resp?.mfaEnabled);
  }

  private iniciarEscuchaPlanes(): void {
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      return;
    }
    this.wsSub?.unsubscribe();
    this.wsSub = this.websocket.subscribeToTopic(topicPlanesUsuario(uid)).subscribe((raw) => {
      const ev = parsePlanWsEvento(raw);
      if (!ev?.tipo) {
        return;
      }
      switch (ev.tipo) {
        case 'solicitud_creada':
          this.solicitudPlanEnRevision.set(true);
          this.solicitudRolSolicitado.set(ev.rolSolicitado || '');
          break;
        case 'solicitud_aprobada':
          this.solicitudPlanEnRevision.set(false);
          this.solicitudRolSolicitado.set('');
          if (ev.rolActual) {
            this.form.role = ev.rolActual;
            this.auth.patchSession({ role: ev.rolActual });
          }
          break;
        case 'solicitud_rechazada':
          this.solicitudPlanEnRevision.set(false);
          this.solicitudRolSolicitado.set('');
          break;
      }
    });
  }

  etiquetaRolSolicitud(): string {
    const r = this.solicitudRolSolicitado().toLowerCase();
    const map: Record<string, string> = {
      emprendedor: 'Emprendedor',
      nutricionista: 'Nutricionista',
    };
    return map[r] || this.solicitudRolSolicitado() || '—';
  }
}
