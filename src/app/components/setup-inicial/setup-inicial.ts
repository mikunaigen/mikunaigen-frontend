import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfigService, TransferenciaBancariaDto } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';
import {
  bloquearTeclasNoNumericas,
  errorCodigo6,
  errorEmailSoloGmail,
  errorPasswordSmtpApp,
  errorTelefono9,
  filtrarSoloDigitos,
} from '../../utils/form-validators';

import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-setup-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent],
  templateUrl: './setup-inicial.component.html',
})
export class SetupInicialComponent implements OnInit {
  codigoVerificacion = '';
  cargando = false;
  cargandoInicial = true;
  sesionActiva = false;

  emailInicial = '';
  configuracionYaCompleta = false;
  smtpPasswordConfigured = false;

  modal = {
    visible: false,
    titulo: '',
    mensaje: '',
    esError: false,
    esExpirado: false,
  };

  config = {
    emailSmtp: '',
    passwordSmtp: '',
    nombreNegocio: '',
    logoBase64: '',
    telefonoNegocio: '',
    terminosCondiciones: '',
    mediosPago: {
      yapeActivo: false,
      yapeTelefono: '',
      plinActivo: false,
      plinTelefono: '',
      transferenciaActiva: false,
      transferencias: [{ banco: '', numeroCuenta: '', cci: '' }] as TransferenciaBancariaDto[],
    },
  };

  constructor(
    private configService: ConfigService,
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.sesionActiva = this.auth.isLoggedIn();
    this.configService.obtenerConfiguracion().subscribe({
      next: (d) => {
        this.cargandoInicial = false;
        this.configuracionYaCompleta = !!d.configuracionCompleta;
        this.smtpPasswordConfigured = !!d.smtpPasswordConfigured;
        this.config.emailSmtp = d.emailSmtp ?? '';
        this.emailInicial = this.config.emailSmtp;
        this.config.passwordSmtp = '';
        this.config.nombreNegocio = d.nombreNegocio ?? '';
        this.config.telefonoNegocio = d.telefonoNegocio ?? '';
        this.config.terminosCondiciones = d.terminosCondiciones ?? '';
        this.config.logoBase64 = d.logoBase64 ?? '';
        this.config.mediosPago.yapeActivo = !!d.mediosPago?.yapeActivo;
        this.config.mediosPago.yapeTelefono = d.mediosPago?.yapeTelefono ?? '';
        this.config.mediosPago.plinActivo = !!d.mediosPago?.plinActivo;
        this.config.mediosPago.plinTelefono = d.mediosPago?.plinTelefono ?? '';
        this.config.mediosPago.transferenciaActiva = !!d.mediosPago?.transferenciaActiva;
        this.config.mediosPago.transferencias =
          d.mediosPago?.transferencias?.length
            ? d.mediosPago.transferencias
            : [{ banco: '', numeroCuenta: '', cci: '' }];
      },
      error: () => {
        this.cargandoInicial = false;
      },
    });
  }

  requiereCodigoSmtp(): boolean {
    if (!this.configuracionYaCompleta) return true;
    const emailCambiado = this.config.emailSmtp !== this.emailInicial;
    const passNuevo = !!(this.config.passwordSmtp && this.config.passwordSmtp.trim());
    return emailCambiado || passNuevo;
  }

  soloNumeros(event: Event, longitudMax: number) {
    return filtrarSoloDigitos(event, longitudMax);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  agregarTransferencia() {
    this.config.mediosPago.transferencias.push({ banco: '', numeroCuenta: '', cci: '' });
  }

  eliminarTransferencia(index: number) {
    if (this.config.mediosPago.transferencias.length <= 1) return;
    this.config.mediosPago.transferencias.splice(index, 1);
  }

  onYapeToggle() {
    if (!this.config.mediosPago.yapeActivo) this.config.mediosPago.yapeTelefono = '';
  }

  onPlinToggle() {
    if (!this.config.mediosPago.plinActivo) this.config.mediosPago.plinTelefono = '';
  }

  onTransferenciaToggle() {
    if (!this.config.mediosPago.transferenciaActiva) return;
    if (!this.config.mediosPago.transferencias.length) {
      this.config.mediosPago.transferencias = [{ banco: '', numeroCuenta: '', cci: '' }];
    }
  }

  onCuentaInput(event: Event, index: number) {
    this.config.mediosPago.transferencias[index].numeroCuenta = this.soloNumeros(event, 20);
  }

  onCciInput(event: Event, index: number) {
    this.config.mediosPago.transferencias[index].cci = this.soloNumeros(event, 20);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.abrirModal('Error de Archivo', 'El logo no debe pesar más de 5MB.', true);
        input.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        this.abrirModal('Formato Inválido', 'Solo se permite JPG o PNG.', true);
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.config.logoBase64 = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  abrirModal(titulo: string, mensaje: string, esError: boolean = false) {
    const esExpirado = mensaje.toLowerCase().includes('expirado');
    this.modal = { visible: true, titulo, mensaje, esError, esExpirado };
  }

  cerrarModal() {
    if (this.modal.esExpirado) {
      this.modal.visible = false;
      this.enviarCodigo();
    } else {
      this.modal.visible = false;
    }
  }

  enviarCodigo() {
    const emailErr = errorEmailSoloGmail(this.config.emailSmtp);
    if (emailErr) {
      this.abrirModal('Error', emailErr, true);
      return;
    }

    if (!this.requiereCodigoSmtp()) {
      this.abrirModal(
        'Sin verificación SMTP',
        'No hay cambios en el correo o contraseña de aplicación. Solo debes usar «Guardar configuración» para actualizar nombre, teléfono, logo o términos.',
        true,
      );
      return;
    }

    const passErr = errorPasswordSmtpApp(this.config.passwordSmtp);
    if (passErr) {
      this.abrirModal('Error', passErr, true);
      return;
    }

    this.cargando = true;
    this.configService
      .enviarVerificacion({
        emailSmtp: this.config.emailSmtp,
        passwordSmtp: this.config.passwordSmtp,
      })
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.abrirModal('Código enviado', res.message ?? 'Revisa tu bandeja.', false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.cargando = false;
          this.abrirModal('Error', err.error?.message ?? 'Error de conexión', true);
        },
      });
  }

  guardar() {
    const emailErr = errorEmailSoloGmail(this.config.emailSmtp);
    if (emailErr) {
      this.abrirModal('Error', emailErr, true);
      return;
    }

    if (!this.configuracionYaCompleta) {
      const passErr = errorPasswordSmtpApp(this.config.passwordSmtp);
      if (passErr) {
        this.abrirModal('Error', passErr, true);
        return;
      }
    } else if (this.requiereCodigoSmtp()) {
      const passErr = errorPasswordSmtpApp(this.config.passwordSmtp);
      if (passErr) {
        this.abrirModal('Error', passErr, true);
        return;
      }
    }

    if (this.requiereCodigoSmtp()) {
      const codErr = errorCodigo6(this.codigoVerificacion);
      if (codErr) {
        this.abrirModal('Código', codErr, true);
        return;
      }
    }

    if (!this.config.nombreNegocio?.trim()) {
      this.abrirModal('Campos incompletos', 'El nombre del negocio es obligatorio.', true);
      return;
    }

    const telErr = errorTelefono9(this.config.telefonoNegocio);
    if (telErr) {
      this.abrirModal('Teléfono inválido', telErr, true);
      return;
    }

    const exigeLogo = !this.config.logoBase64 || !this.config.logoBase64.trim();
    if (exigeLogo) {
      this.abrirModal('Campos incompletos', 'Debes subir el logo del negocio (PNG o JPG).', true);
      return;
    }

    if (!this.config.terminosCondiciones?.trim()) {
      this.abrirModal('Campos incompletos', 'Los términos y condiciones son obligatorios.', true);
      return;
    }

    if (this.config.mediosPago.yapeActivo) {
      const yapeErr = errorTelefono9(this.config.mediosPago.yapeTelefono);
      if (yapeErr) {
        this.abrirModal('Yape inválido', yapeErr, true);
        return;
      }
    }

    if (this.config.mediosPago.plinActivo) {
      const plinErr = errorTelefono9(this.config.mediosPago.plinTelefono);
      if (plinErr) {
        this.abrirModal('Plin inválido', plinErr, true);
        return;
      }
    }

    if (this.config.mediosPago.transferenciaActiva) {
      const transferenciasValidas = this.config.mediosPago.transferencias
        .map((t) => ({
          banco: t.banco?.trim() ?? '',
          numeroCuenta: t.numeroCuenta?.trim() ?? '',
          cci: t.cci?.trim() ?? '',
        }))
        .filter((t) => t.banco || t.numeroCuenta || t.cci);

      if (!transferenciasValidas.length) {
        this.abrirModal('Transferencias', 'Debes ingresar al menos un banco para transferencia.', true);
        return;
      }

      for (const t of transferenciasValidas) {
        if (!t.banco) {
          this.abrirModal('Transferencias', 'El nombre del banco es obligatorio.', true);
          return;
        }
        if (!/^\d{1,20}$/.test(t.numeroCuenta)) {
          this.abrirModal('Transferencias', 'El número de cuenta debe contener solo números (máx. 20).', true);
          return;
        }
        if (!/^\d{1,20}$/.test(t.cci)) {
          this.abrirModal('Transferencias', 'El CCI debe contener solo números (máx. 20).', true);
          return;
        }
      }
    }

    const payload: Record<string, unknown> = {
      emailSmtp: this.config.emailSmtp,
      passwordSmtp: this.config.passwordSmtp?.trim() || '',
      nombreNegocio: this.config.nombreNegocio,
      telefonoNegocio: this.config.telefonoNegocio,
      terminosCondiciones: this.config.terminosCondiciones,
      logoBase64: this.config.logoBase64,
      mediosPago: {
        yapeActivo: this.config.mediosPago.yapeActivo,
        yapeTelefono: this.config.mediosPago.yapeActivo ? this.config.mediosPago.yapeTelefono : '',
        plinActivo: this.config.mediosPago.plinActivo,
        plinTelefono: this.config.mediosPago.plinActivo ? this.config.mediosPago.plinTelefono : '',
        transferenciaActiva: this.config.mediosPago.transferenciaActiva,
        transferencias: this.config.mediosPago.transferenciaActiva
          ? this.config.mediosPago.transferencias
              .map((t) => ({
                banco: t.banco?.trim() ?? '',
                numeroCuenta: t.numeroCuenta?.trim() ?? '',
                cci: t.cci?.trim() ?? '',
              }))
              .filter((t) => t.banco || t.numeroCuenta || t.cci)
          : [],
      },
      codigoVerificacion: this.requiereCodigoSmtp() ? this.codigoVerificacion : '',
    };

    this.cargando = true;
    this.configService.validarYGuardar(payload).subscribe({
      next: () => {
        this.cargando = false;
        this.configuracionYaCompleta = true;
        this.emailInicial = this.config.emailSmtp;
        this.config.passwordSmtp = '';
        this.codigoVerificacion = '';
        this.smtpPasswordConfigured = true;
        this.abrirModal('Éxito', 'Configuración guardada correctamente.', false);
        setTimeout(() => void this.router.navigate(['/presentacion']), 1800);
      },
      error: (err: { error?: { message?: string } }) => {
        this.cargando = false;
        this.abrirModal('Error', err.error?.message ?? 'No se pudo guardar.', true);
      },
    });
  }
}
