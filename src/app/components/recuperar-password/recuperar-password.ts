import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '@env/environment'; 

import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorEmailHistoriaUsuario,
  errorPasswordHistoria,
  filtrarSoloDigitos,
} from '../../utils/form-validators';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recuperar-password.component.html',
})
export class RecuperarPasswordComponent {
  paso = 1;
  cargando = false;
  email = '';
  codigo = '';
  nuevaPassword = '';
  confirmarPassword = '';
  mostrarPassword = false;
  lockedEmail = false;

  modal = { visible: false, titulo: '', mensaje: '', esError: false, esExpirado: false };

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    const locked = this.route.snapshot.queryParamMap.get('locked') === '1';
    if (email) {
      this.email = email;
    }
    this.lockedEmail = locked && !!email;
    if (this.lockedEmail) {
      this.paso = 2;
      this.abrirModal('Código Enviado', 'Revisa tu bandeja de entrada o spam.', false);
    }
  }

  soloNumeros(event: Event, max: number) {
    return filtrarSoloDigitos(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  validarPassword(): { valido: boolean; error?: string } {
    const msg = errorPasswordHistoria(this.nuevaPassword, this.confirmarPassword, '', '');
    if (msg) return { valido: false, error: msg };
    return { valido: true };
  }

  enviarCodigo() {
    const emailErr = errorEmailHistoriaUsuario(this.email);
    if (emailErr) {
      this.abrirModal('Error', emailErr, true);
      return;
    }

    this.cargando = true;
    this.http
      .post(environment.apiUrl + '/auth/enviar-codigo-recuperacion', {
        email: this.email,
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.paso = 2;
          this.abrirModal('Código Enviado', 'Revisa tu bandeja de entrada o spam.', false);
        },
        error: (err) => {
          this.cargando = false;
          this.abrirModal('Error', err.error?.message || 'Error al enviar el código.', true);
        },
      });
  }

  resetearPassword() {
    const codErr = errorCodigo6(this.codigo);
    if (codErr) {
      this.abrirModal('Error', codErr, true);
      return;
    }

    const validacion = this.validarPassword();
    if (!validacion.valido) {
      this.abrirModal('Contraseña Débil', validacion.error!, true);
      return;
    }

    this.cargando = true;
    const payload = { email: this.email, codigo: this.codigo, newPassword: this.nuevaPassword };

    this.http
      .post(environment.apiUrl + '/auth/reset-password', payload)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.abrirModal('¡Éxito!', 'Tu contraseña ha sido actualizada.', false);
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          this.cargando = false;
          this.abrirModal('Error', err.error?.message || 'Código inválido o expirado.', true);
        },
      });
  }

  abrirModal(titulo: string, mensaje: string, esError: boolean) {
    const esExpirado = mensaje.toLowerCase().includes('expirado');
    this.modal = { visible: true, titulo, mensaje, esError, esExpirado };
  }

  cerrarModal() {
    this.modal.visible = false;
    if (this.modal.esExpirado) this.enviarCodigo();
  }
}
