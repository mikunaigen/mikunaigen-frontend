import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { errorEmailHistoriaUsuario } from '../../utils/form-validators';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  mostrarPassword = false;
  cargando = false;

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
      this.abrirModal('Campos Vacíos', 'Por favor ingresa tus credenciales.', false);
      return;
    }

    const emailErr = errorEmailHistoriaUsuario(this.email);
    if (emailErr) {
      this.abrirModal('Correo Inválido', emailErr, true);
      return;
    }

    this.cargando = true;
    this.http
      .post(environment.apiUrl + '/auth/login', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (user: any) => {
          this.cargando = false;
          const guest = sessionStorage.getItem('rb_guest_dark');
          let dark = user.darkMode === true;
          if (guest === '1') dark = true;
          else if (guest === '0') dark = false;
          sessionStorage.removeItem('rb_guest_dark');
          this.auth.setSession({ ...user, darkMode: dark });
          this.theme.persistLoginTheme(dark, String(user.email || ''));

          if (user.firstLogin) {
            void this.router.navigate(['/confirmar-cuenta'], {
              queryParams: { email: user.email },
            });
            return;
          }

          this.irTrasLogin();
        },

        error: (err) => {
          this.cargando = false;
          const status = err.status;
          const mensaje = err.error?.message || 'Credenciales inválidas';
          const intentos = Number(err.error?.failedAttempts ?? 0);

          if (status === 423 || err.error?.blocked === true) {
            this.redirectAlCerrarModal = true;
            this.abrirModal(
              'Acceso restringido',
              `${mensaje} Serás redirigido a la pestaña de retención.`,
              true,
            );
            return;
          }

          if (status === 401 && intentos > 0) {
            this.abrirModal(
              'Error',
              `Contraseña incorrecta. Intento ${intentos}/3.`,
              true,
            );
            return;
          }

          this.abrirModal('Acceso Denegado', mensaje, true);
        },
      });
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
