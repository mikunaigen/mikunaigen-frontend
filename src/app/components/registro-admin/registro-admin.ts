import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { ConfigService } from '../../services/config.service';
import { environment } from '@env/environment'; 
import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorDni8,
  errorEmailHistoriaUsuario,
  errorPasswordHistoria,
  errorTelefono9,
  extraerNombreApellidoDeFullName,
  filtrarSoloDigitos,
  filtrarSoloLetrasYEspacios,
} from '../../utils/form-validators';

@Component({
  selector: 'app-registro-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoutButtonComponent],
  templateUrl: './registro-admin.component.html',
})
export class RegistroAdminComponent {
  paso = 1;
  mostrarPassword = false;
  aceptoTerminos = false;
  cargando = false;
  confirmarPassword = '';
  codigoVerificacion = '';

  usuario = {
    fullName: '',
    dni: '',
    email: '',
    phone: '',
    password: '',
    address: '',
  };

  modal = { visible: false, titulo: '', mensaje: '', esError: false, esExpirado: false };

  constructor(
    private http: HttpClient,
    private router: Router,
    private config: ConfigService,
  ) {}

  soloNumeros(event: Event, max: number) {
    return filtrarSoloDigitos(event, max);
  }

  soloLetras(event: Event, max?: number) {
    return filtrarSoloLetrasYEspacios(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  validarFormulario(): string | null {
    if (!this.usuario.fullName.trim()) {
      return 'Los nombres y apellidos no pueden quedar en blanco.';
    }
    const partes = this.usuario.fullName.trim().split(/\s+/).filter(Boolean);
    if (partes.length < 2) {
      return 'Ingresa nombres y apellidos (al menos dos palabras).';
    }
    if (!this.usuario.address.trim()) {
      return 'La dirección no puede quedar en blanco.';
    }

    const dniErr = errorDni8(this.usuario.dni);
    if (dniErr) return dniErr;

    const telErr = errorTelefono9(this.usuario.phone);
    if (telErr) return telErr;

    const emailErr = errorEmailHistoriaUsuario(this.usuario.email);
    if (emailErr) return emailErr;

    const { nombre, apellido } = extraerNombreApellidoDeFullName(this.usuario.fullName);
    const pwdErr = errorPasswordHistoria(
      this.usuario.password,
      this.confirmarPassword,
      nombre,
      apellido,
    );
    if (pwdErr) return pwdErr;

    if (!this.aceptoTerminos) {
      return 'Debes aceptar los términos y condiciones de uso.';
    }

    return null;
  }

  enviarCodigoRegistro() {
    const err = this.validarFormulario();
    if (err) {
      this.abrirModal('Validación', err, true);
      return;
    }

    this.cargando = true;
    this.http
      .post(environment.apiUrl + '/auth/enviar-codigo-registro', {
        fullName: this.usuario.fullName.trim(),
        dni: this.usuario.dni,
        email: this.usuario.email,
        phone: this.usuario.phone,
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.abrirModal('Verificación Enviada', 'Código enviado a ' + this.usuario.email, false);
          this.paso = 2;
        },
        error: (err) => {
          this.cargando = false;
          const msg = err.error?.message || 'Error al enviar código';
          this.abrirModal(String(msg).includes('Ya existe') ? 'Datos duplicados' : 'Error', msg, true);
        },
      });
  }

  confirmarRegistro() {
    const codErr = errorCodigo6(this.codigoVerificacion);
    if (codErr) {
      this.abrirModal('Error de Validación', codErr, true);
      return;
    }

    this.cargando = true;
    const payload = { ...this.usuario, codigo: this.codigoVerificacion };

    this.http
      .post(environment.apiUrl + '/auth/registrar-admin', payload)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.abrirModal(
            '¡Éxito!',
            'Cuenta de Administrador creada. Ahora puedes iniciar sesión.',
            false,
          );
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },
        error: (err) => {
          this.cargando = false;
          const msg = err.error?.message || 'Código incorrecto';
          this.abrirModal('Error de Validación', msg, true);
        },
      });
  }

  abrirModal(titulo: string, mensaje: string, esError: boolean) {
    const esExpirado = mensaje.toLowerCase().includes('expirado');
    this.modal = { visible: true, titulo, mensaje, esError, esExpirado };
  }

  cerrarModal() {
    this.modal.visible = false;
    if (this.modal.esExpirado) this.enviarCodigoRegistro();
  }

  mostrarTerminos() {
    this.config.obtenerConfiguracion().subscribe({
      next: (cfg) => {
        const t = cfg.terminosCondiciones?.trim();
        this.abrirModal('Términos y Condiciones', t || 'No hay términos configurados.', false);
      },
      error: () =>
        this.abrirModal('Términos y Condiciones', 'No se pudieron cargar los términos.', true),
    });
  }
}
