import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { NgIconComponent } from '@ng-icons/core';
import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorEmailHistoriaUsuario,
  filtrarSoloDigitos,
} from '../../utils/form-validators';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { MfaService } from '../../services/mfa.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  paso: 'credenciales' | 'mfa' = 'credenciales';
  email = '';
  password = '';
  mostrarPassword = false;
  cargando = false;

  mfaToken = '';
  mfaEmail = '';
  mfaCode = '';
  mfaBackupCode = '';
  usarCodigoRespaldo = false;

  logoSrc = '/mikunaigenlogo-borde.png';
  logoEsDelNegocio = false;
  tituloMarca = 'Mikunaigen';

  modal = { visible: false, titulo: '', mensaje: '', esError: false };
  redirectAlCerrarModal = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private configService: ConfigService,
    private theme: ThemeService,
    private mfaService: MfaService,
  ) {}

  ngOnInit() {
    this.configService
      .obtenerConfiguracion()
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        const nombre = cfg?.nombreNegocio?.trim();
        if (nombre) {
          this.tituloMarca = nombre;
        }
        const logo = cfg?.logoBase64?.trim();
        if (logo) {
          this.logoSrc = logo;
          this.logoEsDelNegocio = true;
        }
      });
  }

  onLogin() {
    if (!this.email?.trim() || !this.password) {
      this.abrirModal('Campos vacíos', 'Por favor ingresa tus credenciales.', false);
      return;
    }

    const emailErr = errorEmailHistoriaUsuario(this.email);
    if (emailErr) {
      this.abrirModal('Correo inválido', emailErr, true);
      return;
    }

    this.cargando = true;
    this.http
      .post(environment.apiUrl + '/auth/login', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (user) => {
          this.cargando = false;
          this.manejarRespuestaAuth(user as Record<string, unknown>);
        },
        error: (err) => this.manejarErrorLogin(err),
      });
  }

  soloNumerosMfa(event: Event) {
    this.mfaCode = filtrarSoloDigitos(event, 6);
  }

  bloquearNoNumericoMfa(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  volverCredenciales() {
    this.paso = 'credenciales';
    this.mfaToken = '';
    this.mfaCode = '';
    this.mfaBackupCode = '';
    this.usarCodigoRespaldo = false;
  }

  onVerificarMfa() {
    if (!this.mfaToken) {
      this.abrirModal('Sesión expirada', 'Vuelve a iniciar sesión con tu correo y contraseña.', true);
      this.volverCredenciales();
      return;
    }
    if (!this.usarCodigoRespaldo) {
      const codErr = errorCodigo6(this.mfaCode);
      if (codErr) {
        this.abrirModal('Código inválido', codErr, true);
        return;
      }
    } else if (!this.mfaBackupCode.trim()) {
      this.abrirModal('Código de respaldo', 'Ingresa uno de tus códigos de recuperación.', true);
      return;
    }

    this.cargando = true;
    const payload = this.usarCodigoRespaldo
      ? { mfaToken: this.mfaToken, backupCode: this.mfaBackupCode.trim() }
      : { mfaToken: this.mfaToken, code: this.mfaCode };

    this.mfaService.verificarLogin(payload).subscribe({
      next: (user) => {
        this.cargando = false;
        this.procesarLoginExitoso(user);
      },
      error: (err) => {
        this.cargando = false;
        this.manejarErrorLogin(err, true);
      },
    });
  }

  private manejarRespuestaAuth(user: Record<string, unknown>) {
    if (user?.['mfaRequired'] === true && user?.['mfaToken']) {
      this.paso = 'mfa';
      this.mfaToken = String(user['mfaToken']);
      this.mfaEmail = String(user['email'] || this.email);
      this.mfaCode = '';
      this.mfaBackupCode = '';
      this.usarCodigoRespaldo = false;
      return;
    }
    this.procesarLoginExitoso(user);
  }

  private procesarLoginExitoso(user: Record<string, unknown>) {
    const guest = sessionStorage.getItem('rb_guest_dark');
    let dark = user['darkMode'] === true;
    if (guest === '1') dark = true;
    else if (guest === '0') dark = false;
    sessionStorage.removeItem('rb_guest_dark');
    this.auth.setSession({ ...(user as object), darkMode: dark });
    this.theme.persistLoginTheme(dark, String(user['email'] || ''));

    if (user['firstLogin']) {
      void this.router.navigate(['/confirmar-cuenta'], {
        queryParams: { email: user['email'] },
      });
      return;
    }

    this.irTrasLogin();
  }

  private manejarErrorLogin(err: { status?: number; error?: Record<string, unknown> }, esMfa = false) {
    this.cargando = false;
    const status = err.status;
    const mensaje = String(err.error?.['message'] || 'Credenciales inválidas');
    const intentos = Number(err.error?.['failedAttempts'] ?? 0);
    const restantes = Number(err.error?.['remainingAttempts'] ?? 0);

    if (status === 423 || err.error?.['blocked'] === true) {
      this.redirectAlCerrarModal = true;
      this.abrirModal(
        'Acceso restringido',
        `${mensaje} Serás redirigido a la vista de retención.`,
        true,
      );
      return;
    }

    if (status === 401 && intentos > 0) {
      this.abrirModal(
        esMfa ? 'Intento fallido' : 'Error',
        esMfa
          ? `Código incorrecto. Intento ${intentos}/3. Te quedan ${restantes} intento(s).`
          : `Contraseña incorrecta. Intento ${intentos}/3.`,
        true,
      );
      return;
    }

    this.abrirModal(esMfa ? 'Verificación fallida' : 'Acceso denegado', mensaje, true);
  }

  abrirModal(titulo: string, mensaje: string, esError: boolean) {
    this.modal = { visible: true, titulo, mensaje, esError };
  }

  cerrarModal() {
    this.modal.visible = false;
    if (this.redirectAlCerrarModal) {
      this.redirectAlCerrarModal = false;
      void this.router.navigate(['/retenido']);
    }
  }

  private irTrasLogin(): void {
    const s = this.auth.getSession();
    if (!s?.role) {
      return;
    }
    const ret = this.route.snapshot.queryParamMap.get('returnUrl')?.trim();
    if (ret && ret.startsWith('/') && !ret.startsWith('//') && this.auth.esUsuarioFormulacion(s.role)) {
      void this.router.navigateByUrl(ret);
      return;
    }
    const path = this.auth.getPostLoginPath();
    const queryParams = this.auth.getPostLoginQueryParams();
    void this.router.navigate([path], { queryParams });
  }
}
