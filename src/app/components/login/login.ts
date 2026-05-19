import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { errorEmailHistoriaUsuario } from '../../utils/form-validators';
import { AuthService } from '../../services/auth.service';
import { CartService, type VerificarPreciosResponseDto } from '../../services/cart.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

  modalDisponibilidad = { visible: false, items: [] as string[] };

  modalPreciosLogin: {
    detalle: { nombre: string; precioAnterior: number; precioNuevo: number }[];
    totalAnterior: number;
    totalNuevo: number;
  } | null = null;

  private pendingVerifyTrasDisponibilidadLogin: VerificarPreciosResponseDto | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cart: CartService,
    private configService: ConfigService,
    private theme: ThemeService,
  ) {}

  esLoginAdmin = false;

  ngOnInit() {
    this.esLoginAdmin = this.route.snapshot.queryParamMap.get('admin') === '1';
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
        soloAdministrador: this.esLoginAdmin ? 'true' : 'false',
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
            this.cart.applyFromLoginPayload(user);
            void this.router.navigate(['/confirmar-cuenta'], {
              queryParams: { email: user.email },
            });
            return;
          }

          const snap = this.cart.readPersistedSnapshot();
          if (user.userId && snap && snap.userId !== user.userId) {
            this.cart.clearPriceSnapshot();
          }

          const continuarTrasCarrito = (verifyResp: VerificarPreciosResponseDto | null) => {
            const removed: string[] = Array.isArray(user.removedItems) ? user.removedItems : [];
            if (user.role === 'CLIENTE' && removed.length > 0) {
              this.modalDisponibilidad = { visible: true, items: removed };
              if (verifyResp?.preciosCambiaron) {
                this.pendingVerifyTrasDisponibilidadLogin = verifyResp;
              }
              return;
            }
            if (verifyResp?.preciosCambiaron) {
              this.modalPreciosLogin = {
                detalle: verifyResp.detalleCambios ?? [],
                totalAnterior: verifyResp.totalAnterior,
                totalNuevo: verifyResp.totalNuevo,
              };
              return;
            }
            this.irTrasLoginClientePreferente();
          };

          const snapOk =
            user.role === 'CLIENTE' &&
            user.userId &&
            snap &&
            snap.userId === user.userId &&
            snap.lines.length > 0;

          if (snapOk) {
            this.cart
              .verificarPreciosCheckout({
                lineasCliente: snap.lines.map((l) => ({
                  productId: l.productId,
                  precioUnitario: l.unitPrice,
                  cantidad: l.quantity,
                })),
                totalCliente: snap.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
              })
              .subscribe({
                next: (r) => {
                  this.cart.applyFromLoginPayload(user);
                  continuarTrasCarrito(r);
                },
                error: () => {
                  this.cart.applyFromLoginPayload(user);
                  continuarTrasCarrito(null);
                },
              });
            return;
          }

          this.cart.applyFromLoginPayload(user);
          continuarTrasCarrito(null);
        },

        error: (err) => {
          this.cargando = false;
          const status = err.status;
          const mensaje = err.error?.message || 'Credenciales inválidas';
          const intentos = Number(err.error?.failedAttempts ?? 0);
          const restantes = Number(err.error?.remainingAttempts ?? 0);

          if (status === 423 || err.error?.blocked === true) {
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
              'Intento fallido',
              `Contraseña incorrecta. Intento ${intentos}/3. Te quedan ${restantes} intento(s).`,
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

  cerrarModalDisponibilidad() {
    this.modalDisponibilidad.visible = false;
    const pending = this.pendingVerifyTrasDisponibilidadLogin;
    this.pendingVerifyTrasDisponibilidadLogin = null;
    if (pending?.preciosCambiaron) {
      this.modalPreciosLogin = {
        detalle: pending.detalleCambios ?? [],
        totalAnterior: pending.totalAnterior,
        totalNuevo: pending.totalNuevo,
      };
      return;
    }
    this.irTrasLoginClientePreferente();
  }

  cerrarModalPreciosLogin(): void {
    this.modalPreciosLogin = null;
    this.irTrasLoginClientePreferente();
  }

  formatoMoneda(v: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
  }

  nombresCambioPrecioLogin(): string {
    const m = this.modalPreciosLogin;
    if (!m?.detalle?.length) {
      return '';
    }
    return m.detalle.map((d) => d.nombre).join(', ');
  }

  private irTrasLoginClientePreferente(): void {
    const s = this.auth.getSession();
    if (!s?.role) {
      return;
    }
    const ret = this.route.snapshot.queryParamMap.get('returnUrl')?.trim();
    if (ret && ret.startsWith('/') && !ret.startsWith('//') && s.role === 'CLIENTE') {
      void this.router.navigateByUrl(ret);
      return;
    }
    this.navegarTrasLogin(s.role);
  }

  private navegarTrasLogin(role: string) {
    if (this.auth.esAdministrador(role)) {
      void this.router.navigate(['/dashboard']);
      return;
    }
    if (this.auth.esUsuarioFormulacion(role)) {
      void this.router.navigate(['/menu']);
    }
  }
}
