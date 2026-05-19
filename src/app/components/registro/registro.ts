import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { catchError, of, Subscription, interval, switchMap, takeWhile, filter } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment';
import { NgIconComponent } from '@ng-icons/core';
import {
  bloquearTeclasNoNumericas,
  errorDni8,
  errorEmailHistoriaUsuario,
  errorPasswordHistoria,
  errorTelefono9,
  evaluarCriteriosPassword,
  filtrarSoloDigitos,
  filtrarSoloLetrasYEspacios,
  TEXTO_DESCARGO_RESPONSABILIDAD,
  type CriteriosPassword,
} from '../../utils/form-validators';

const PREFIJO_CODIGO_ACTIVACION = 'MIKUNA-VALTEL-';

type RegistroPendienteResponse = {
  message?: string;
  userId?: string;
  codigoActivacion?: string;
  prefijoCodigo?: string;
  digitosCodigo?: string;
  telegramBotUsername?: string;
  primerUsuario?: boolean;
  segundosRestantes?: number;
  codigoVigente?: boolean;
};

type EstadoActivacionResponse = {
  activo?: boolean;
  estado?: string;
  codigoVigente?: boolean;
  codigoExpirado?: boolean;
  segundosRestantes?: number;
  digitosCodigo?: string;
  message?: string;
};

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent],
  templateUrl: './registro.component.html',
})
export class RegistroComponent implements OnInit, OnDestroy {
  isAdminMode: boolean | null = null;
  paso = 1;
  mostrarPassword = false;
  aceptoTerminos = false;
  aceptoDescargo = false;
  cargando = false;
  confirmarPassword = '';
  esperandoTelegram = false;
  codigoExpirado = false;
  segundosRestantes = 0;

  readonly prefijoCodigo = PREFIJO_CODIGO_ACTIVACION;
  digitosCodigo = '';
  userIdRegistro = '';
  telegramBotUsername = '';

  usuario = {
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    phone: '',
    password: '',
  };

  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '', esExpirado: false };
  logoSrc = '/mikunaigenlogo-borde.png';
  logoEsDelNegocio = false;
  tituloMarca = 'Mikunaigen';

  private wsSub?: Subscription;
  private pollSub?: Subscription;
  private countdownSub?: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private config: ConfigService,
    private auth: AuthService,
    private websocket: WebsocketService,
  ) {}

  ngOnInit() {
    this.config
      .obtenerConfiguracion()
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        const nombre = cfg?.nombreNegocio?.trim();
        if (nombre) this.tituloMarca = nombre;
        const logo = cfg?.logoBase64?.trim();
        if (logo) {
          this.logoSrc = logo;
          this.logoEsDelNegocio = true;
        }
      });

    this.auth.obtenerEstadoUsuarios().subscribe({
      next: (res) => {
        this.isAdminMode = res.sinUsuarios;
      },
      error: () =>
        this.abrirModal('error', 'Error de Conexión', 'No se pudo contactar al servidor.'),
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.countdownSub?.unsubscribe();
  }

  get tiempoRestanteTexto(): string {
    const m = Math.floor(this.segundosRestantes / 60);
    const s = this.segundosRestantes % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get codigoActivacionCompleto(): string {
    return this.prefijoCodigo + this.digitosCodigo;
  }

  soloNumeros(event: Event, max: number) {
    return filtrarSoloDigitos(event, max);
  }

  soloLetras(event: Event, max?: number) {
    return filtrarSoloLetrasYEspacios(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  get pwdCriterios(): CriteriosPassword {
    return evaluarCriteriosPassword(this.usuario.password);
  }

  validarFormulario(): { valido: boolean; error?: string } {
    if (!this.usuario.nombres.trim() || !this.usuario.apellidos.trim()) {
      return { valido: false, error: 'Nombres y apellidos no pueden quedar en blanco.' };
    }

    const dniErr = errorDni8(this.usuario.dni);
    if (dniErr) return { valido: false, error: dniErr };

    const telErr = errorTelefono9(this.usuario.phone);
    if (telErr) return { valido: false, error: telErr };

    const emailErr = errorEmailHistoriaUsuario(this.usuario.email);
    if (emailErr) return { valido: false, error: emailErr };

    const nombreFirst = this.usuario.nombres.split(' ')[0]?.toLowerCase() ?? '';
    const apellidoFirst = this.usuario.apellidos.split(' ')[0]?.toLowerCase() ?? '';
    const pwdErr = errorPasswordHistoria(
      this.usuario.password,
      this.confirmarPassword,
      nombreFirst,
      apellidoFirst,
    );
    if (pwdErr) return { valido: false, error: pwdErr };

    if (!this.aceptoTerminos) {
      return { valido: false, error: 'Debes aceptar los términos y condiciones de uso.' };
    }
    if (!this.aceptoDescargo) {
      return { valido: false, error: 'Debes aceptar el descargo de responsabilidad.' };
    }

    return { valido: true };
  }

  abrirTerminos(event: Event) {
    event.preventDefault();
    this.config.obtenerConfiguracion().subscribe({
      next: (cfg) => {
        const t = cfg.terminosCondiciones?.trim();
        this.abrirModal(
          'terminos',
          'Términos y Condiciones de Uso',
          t || 'No hay términos configurados.',
        );
      },
      error: () =>
        this.abrirModal(
          'terminos',
          'Términos y Condiciones de Uso',
          'No se pudieron cargar los términos.',
        ),
    });
  }

  aceptarTerminos() {
    this.aceptoTerminos = true;
    this.modal.visible = false;
  }

  rechazarTerminos() {
    this.aceptoTerminos = false;
    this.modal.visible = false;
  }

  abrirDescargo(event: Event) {
    event.preventDefault();
    this.abrirModal('descargo', 'Descargo de responsabilidad', TEXTO_DESCARGO_RESPONSABILIDAD);
  }

  aceptarDescargo() {
    this.aceptoDescargo = true;
    this.modal.visible = false;
  }

  rechazarDescargo() {
    this.aceptoDescargo = false;
    this.modal.visible = false;
  }

  enviarRegistro() {
    const validacion = this.validarFormulario();
    if (!validacion.valido) {
      this.abrirModal('error', 'Error de Validación', validacion.error!);
      return;
    }

    this.cargando = true;
    const payload = {
      fullName: `${this.usuario.nombres} ${this.usuario.apellidos}`.trim(),
      dni: this.usuario.dni,
      email: this.usuario.email,
      phone: this.usuario.phone,
      password: this.usuario.password,
      aceptoTerminos: this.aceptoTerminos,
      aceptoDescargo: this.aceptoDescargo,
    };

    const url = this.isAdminMode
      ? `${environment.apiUrl}/auth/registrar-admin`
      : `${environment.apiUrl}/auth/registrar-pendiente`;

    this.http.post<RegistroPendienteResponse>(url, payload).subscribe({
      next: (res) => {
        this.cargando = false;
        this.userIdRegistro = res.userId ?? '';
        this.digitosCodigo = res.digitosCodigo ?? '';
        this.telegramBotUsername = (res.telegramBotUsername ?? '').replace(/^@/, '');
        if (!this.digitosCodigo && res.codigoActivacion?.startsWith(this.prefijoCodigo)) {
          this.digitosCodigo = res.codigoActivacion.slice(this.prefijoCodigo.length);
        }
        this.paso = 2;
        this.esperandoTelegram = true;
        this.codigoExpirado = false;
        this.segundosRestantes = res.segundosRestantes ?? 120;
        this.iniciarEscuchaActivacion();
        this.iniciarCuentaRegresiva();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || 'Error al registrar';
        this.abrirModal(
          'error',
          String(msg).includes('Ya existe') ? 'Datos duplicados' : 'Error',
          msg,
        );
      },
    });
  }

  volverPaso1() {
    const userId = this.userIdRegistro;
    this.paso = 1;
    this.esperandoTelegram = false;
    this.codigoExpirado = false;
    this.userIdRegistro = '';
    this.digitosCodigo = '';
    this.segundosRestantes = 0;
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.countdownSub?.unsubscribe();

    if (userId) {
      this.http
        .delete(`${environment.apiUrl}/auth/cancelar-registro-pendiente/${userId}`)
        .subscribe({ error: () => {} });
    }
  }

  solicitarNuevoCodigo() {
    if (!this.userIdRegistro || this.cargando) {
      return;
    }
    this.cargando = true;
    this.http
      .post<RegistroPendienteResponse>(
        `${environment.apiUrl}/auth/renovar-codigo-activacion/${this.userIdRegistro}`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.digitosCodigo = res.digitosCodigo ?? this.digitosCodigo;
          this.codigoExpirado = false;
          this.esperandoTelegram = true;
          this.segundosRestantes = res.segundosRestantes ?? 120;
          this.iniciarCuentaRegresiva();
        },
        error: (err) => {
          this.cargando = false;
          this.abrirModal('error', 'Error', err.error?.message || 'No se pudo generar un nuevo código.');
        },
      });
  }

  abrirTelegram() {
    if (!this.telegramBotUsername) {
      this.abrirModal(
        'error',
        'Telegram no configurado',
        'El bot de Telegram no está disponible. Contacta al administrador.',
      );
      return;
    }
    const startParam = encodeURIComponent(this.codigoActivacionCompleto);
    const url = `https://t.me/${this.telegramBotUsername}?start=${startParam}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private iniciarEscuchaActivacion() {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();

    if (this.userIdRegistro) {
      this.wsSub = this.websocket
        .subscribeToTopic(`/topic/registro-activacion/${this.userIdRegistro}`)
        .subscribe((body) => {
          try {
            const data = JSON.parse(body) as { estado?: string; message?: string };
            this.procesarEventoActivacion(data.estado, data.message);
          } catch {
            if (body.includes('activo')) {
              this.onCuentaActivada();
            } else if (body.includes('telefono_no_coincide')) {
              this.onTelefonoNoCoincide();
            }
          }
        });

      this.pollSub = interval(2000)
        .pipe(
          switchMap(() =>
            this.http.get<EstadoActivacionResponse>(
              `${environment.apiUrl}/auth/estado-activacion/${this.userIdRegistro}`,
            ),
          ),
          takeWhile(() => this.paso === 2),
        )
        .subscribe((r) => this.aplicarEstadoActivacion(r));
    }
  }

  private procesarEventoActivacion(estado?: string, message?: string) {
    if (estado === 'activo') {
      this.onCuentaActivada();
      return;
    }
    if (estado === 'telefono_no_coincide') {
      this.onTelefonoNoCoincide(message);
    }
  }

  private aplicarEstadoActivacion(r: EstadoActivacionResponse) {
    if (r.digitosCodigo) {
      this.digitosCodigo = r.digitosCodigo;
    }
    if (r.segundosRestantes != null && r.codigoVigente) {
      this.segundosRestantes = r.segundosRestantes;
    }
    if (r.activo || r.estado === 'activo') {
      this.onCuentaActivada();
      return;
    }
    if (r.codigoExpirado || r.codigoVigente === false) {
      this.codigoExpirado = true;
      this.esperandoTelegram = false;
    }
  }

  private onTelefonoNoCoincide(message?: string) {
    this.abrirModal(
      'error',
      'Teléfono no coincide',
      message || 'Esta cuenta de telegram no coincide con el número ingresado',
    );
  }

  private iniciarCuentaRegresiva() {
    this.countdownSub?.unsubscribe();
    this.countdownSub = interval(1000).subscribe(() => {
      if (this.segundosRestantes > 0) {
        this.segundosRestantes -= 1;
      }
      if (this.segundosRestantes <= 0 && this.paso === 2 && !this.codigoExpirado) {
        this.codigoExpirado = true;
        this.esperandoTelegram = false;
      }
    });
  }

  private onCuentaActivada() {
    if (!this.esperandoTelegram) {
      return;
    }
    this.esperandoTelegram = false;
    this.codigoExpirado = false;
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.countdownSub?.unsubscribe();
    this.abrirModal('exito', 'Cuenta activada', 'Tu cuenta fue activada correctamente. Redirigiendo al inicio de sesión…');
    setTimeout(() => this.router.navigate(['/login']), 2500);
  }

  abrirModal(tipo: string, titulo: string, mensaje: string) {
    const esExpirado = mensaje.toLowerCase().includes('expirado');
    this.modal = { visible: true, tipo, titulo, mensaje, esExpirado };
  }

  cerrarModal() {
    this.modal.visible = false;
  }
}
