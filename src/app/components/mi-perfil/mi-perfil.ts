import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { AuthService } from '../../services/auth.service';
import { bloquearTeclasNoNumericas, errorTelefono9, filtrarSoloDigitos } from '../../utils/form-validators';
import { environment } from '@env/environment'; 

type PerfilResponse = {
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  dni: string;
  email: string;
  role: string;
  canEditAddress: boolean;
};

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent],
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly apiPerfil = environment.apiUrl + '/perfil';

  cargando = signal(true);
  guardando = signal(false);
  enviandoCodigo = signal(false);
  canEditAddress = signal(true);
  roleVisible = signal(false);

  form = {
    fullName: '',
    phone: '',
    address: '',
    dni: '',
    email: '',
    role: '',
  };

  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  ngOnInit(): void {
    this.cargarPerfil();
  }

  volver(): void {
    const path = this.auth.getPostLoginPath();
    const queryParams = this.auth.getPostLoginQueryParams();
    
    this.router.navigate([path], { queryParams });
  }

  soloNumeros(event: Event, max: number): void {
    this.form.phone = filtrarSoloDigitos(event, max);
  }

  bloquearNoNumerico(event: KeyboardEvent): void {
    bloquearTeclasNoNumericas(event);
  }

  guardarCambios(): void {
    const fullName = this.form.fullName.trim();
    const address = this.form.address.trim();
    const phone = (this.form.phone || '').replace(/\D/g, '');
    if (!fullName) {
      this.modal.set({ tipo: 'error', titulo: 'Mi Perfil', mensaje: 'Nombres y apellidos es obligatorio.' });
      return;
    }
    if (!address) {
      this.modal.set({ tipo: 'error', titulo: 'Mi Perfil', mensaje: 'La dirección es obligatoria.' });
      return;
    }
    const phoneErr = errorTelefono9(phone);
    if (phoneErr) {
      this.modal.set({ tipo: 'error', titulo: 'Mi Perfil', mensaje: phoneErr });
      return;
    }
    this.guardando.set(true);
    this.http
      .put<PerfilResponse>(`${this.apiPerfil}/me`, {
        fullName,
        phone,
        address,
      })
      .subscribe({
        next: (resp) => {
          this.guardando.set(false);
          this.aplicarRespuesta(resp);
          this.auth.patchSession({
            fullName: resp.fullName,
            phone: resp.phone,
            address: resp.address,
          });
          this.modal.set({ tipo: 'ok', titulo: 'Mi Perfil', mensaje: 'Tus datos han sido actualizados correctamente' });
        },
        error: (err) => {
          this.guardando.set(false);
          this.modal.set({
            tipo: 'error',
            titulo: 'Mi Perfil',
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

  private cargarPerfil(): void {
    this.cargando.set(true);
    this.http.get<PerfilResponse>(`${this.apiPerfil}/me`).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.aplicarRespuesta(resp);
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Mi Perfil',
          mensaje: err?.error?.message || 'No se pudo cargar tu información.',
        });
      },
    });
  }

  private aplicarRespuesta(resp: PerfilResponse): void {
    this.form.fullName = String(resp?.fullName || '');
    this.form.phone = String(resp?.phone || '');
    this.form.address = String(resp?.address || '');
    this.form.dni = String(resp?.dni || '');
    this.form.email = String(resp?.email || '');
    this.form.role = String(resp?.role || '');
    this.canEditAddress.set(!!resp?.canEditAddress);
    this.roleVisible.set(this.form.role !== 'CLIENTE');
  }
}
