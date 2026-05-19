import { Component } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment'; 
import {
  bloquearTeclasNoNumericas,
  errorDni8,
  errorEmailHistoriaUsuario,
  errorTelefono9,
  filtrarSoloDigitos,
  filtrarSoloLetrasYEspacios,
} from '../../utils/form-validators';

@Component({
  selector: 'app-crear-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './crear-personal.component.html',
})
export class CrearPersonalComponent {
  cargando = false;
  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '' };

  empleado = {
    role: '',
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
  };

  constructor(private http: HttpClient) {}

  soloNumeros(event: Event, max: number) {
    return filtrarSoloDigitos(event, max);
  }

  soloLetras(event: Event, max?: number) {
    return filtrarSoloLetrasYEspacios(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent) {
    bloquearTeclasNoNumericas(event);
  }

  seleccionarRol(rol: string) {
    this.empleado.role = rol;
  }

  crearCuenta() {
    if (!this.empleado.role) {
      this.abrirModal('error', 'Falta Rol', 'Por favor selecciona Cajero, Cocinero o Repartidor.');
      return;
    }
    if (
      !this.empleado.nombres ||
      !this.empleado.apellidos ||
      !this.empleado.dni ||
      !this.empleado.email ||
      !this.empleado.phone ||
      !this.empleado.address
    ) {
      this.abrirModal('error', 'Campos Vacíos', 'Todos los campos son obligatorios.');
      return;
    }
    const dniErr = errorDni8(this.empleado.dni);
    if (dniErr) {
      this.abrirModal('error', 'DNI Inválido', dniErr);
      return;
    }
    const telErr = errorTelefono9(this.empleado.phone);
    if (telErr) {
      this.abrirModal('error', 'Teléfono Inválido', telErr);
      return;
    }
    const emailErr = errorEmailHistoriaUsuario(this.empleado.email);
    if (emailErr) {
      this.abrirModal('error', 'Correo Inválido', emailErr);
      return;
    }

    this.cargando = true;
    const payload = {
      ...this.empleado,
      fullName: `${this.empleado.nombres} ${this.empleado.apellidos}`.trim(),
    };

    this.http
      .post(environment.apiUrl + '/auth/crear-empleado', payload)
      .subscribe({
        next: (res: any) => {
          this.cargando = false;
          this.abrirModal('exito', 'Personal Creado', res.message);
          this.empleado = {
            role: '',
            nombres: '',
            apellidos: '',
            dni: '',
            email: '',
            phone: '',
            address: '',
          };
        },
        error: (err) => {
          this.cargando = false;
          const msg = err.error?.message || 'Error del servidor.';
          const duplicado = String(msg).includes('Ya existe');
          this.abrirModal(duplicado ? 'advertencia' : 'error', duplicado ? 'Datos duplicados' : 'Error al crear', msg);
        },
      });
  }

  abrirModal(tipo: string, titulo: string, mensaje: string) {
    this.modal = { visible: true, tipo, titulo, mensaje };
  }
  cerrarModal() {
    this.modal.visible = false;
  }
}
