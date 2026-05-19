import { Component, OnInit } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment'; 
import { LogoutButtonComponent } from '../logout-button/logout-button';
import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorPasswordHistoria,
  evaluarCriteriosPassword,
  filtrarSoloDigitos,
  type CriteriosPassword,
} from '../../utils/form-validators';

@Component({
  selector: 'app-confirmar-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './confirmar-cuenta.component.html',
})
export class ConfirmarCuentaComponent implements OnInit {
  paso = 1;
  email = '';
  cargando = false;
  mostrarPassword = false;
  aceptoTerminos = false;

  codigoVerificacion = '';
  nuevaPassword = '';
  confirmarPassword = '';

  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '', esExpirado: false };

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private config: ConfigService,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (!this.email) {
        const s = this.auth.getSession();
        this.email = (s?.email as string) || '';
      }
      if (!this.email) {
        void this.router.navigate(['/login']);
      }
    });
  }

  soloNumeros(event: Event, max: number) {
    return filtrarSoloDigitos(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  get pwdCriterios(): CriteriosPassword {
    return evaluarCriteriosPassword(this.nuevaPassword);
  }

  validarPassword(): { valido: boolean; error?: string } {
    const msg = errorPasswordHistoria(this.nuevaPassword, this.confirmarPassword, '', '');
    if (msg) return { valido: false, error: msg };
    return { valido: true };
  }

  enviarCodigo() {
    this.cargando = true;
    this.http
      .post(environment.apiUrl + '/auth/enviar-codigo-empleado', {
        email: this.email,
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.paso = 2;
          this.abrirModal(
            'exito',
            'Código Enviado',
            `Se envió un código a ${this.email} para verificar tu identidad.`,
          );
        },
        error: (err) => {
          this.cargando = false;
          this.abrirModal('error', 'Error', err.error?.message || 'Error al enviar código');
        },
      });
  }

  confirmarYCrearClave() {
    const codErr = errorCodigo6(this.codigoVerificacion);
    if (codErr) {
      this.abrirModal('error', 'Código Inválido', codErr);
      return;
    }

    const val = this.validarPassword();
    if (!val.valido) {
      this.abrirModal('error', 'Contraseña Débil', val.error!);
      return;
    }

    this.cargando = true;
    const payload = {
      email: this.email,
      codigo: this.codigoVerificacion,
      password: this.nuevaPassword,
    };

    this.http
      .post(environment.apiUrl + '/auth/confirmar-empleado', payload)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.abrirModal(
            'exito',
            '¡Cuenta Activada!',
            'Tu contraseña ha sido configurada correctamente.',
          );
          setTimeout(() => {
            this.auth.clearSession();
            this.theme.onLogout();
            void this.router.navigate(['/login']);
          }, 2500);
        },
        error: (err) => {
          this.cargando = false;
          this.abrirModal('error', 'Error', err.error?.message || 'Código incorrecto o expirado.');
        },
      });
  }

  mostrarTerminos() {
    this.config.obtenerConfiguracion().subscribe({
      next: (cfg) => {
        const t = cfg.terminosCondiciones?.trim();
        this.abrirModal('terminos', 'Términos y Condiciones', t || 'No hay términos configurados.');
      },
      error: () =>
        this.abrirModal(
          'terminos',
          'Términos y Condiciones',
          'No se pudieron cargar los términos.',
        ),
    });
  }

  abrirModal(tipo: string, titulo: string, mensaje: string) {
    const esExpirado = mensaje.toLowerCase().includes('expirado');
    this.modal = { visible: true, tipo, titulo, mensaje, esExpirado };
  }

  cerrarModal() {
    this.modal.visible = false;
    if (this.modal.esExpirado) this.enviarCodigo();
  }

  aceptarTerminos() {
    this.aceptoTerminos = true;
    this.modal.visible = false;
  }
  rechazarTerminos() {
    this.aceptoTerminos = false;
    this.modal.visible = false;
  }
}
