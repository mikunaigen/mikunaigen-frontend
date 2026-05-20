import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../services/auth.service';
import { ObjetivoNutricionalService } from '../../services/objetivo-nutricional.service';
import {
  CAMPOS_OBJETIVO_NUTRICIONAL,
  CampoObjetivoDef,
  ObjetivoNutricionalValores,
  objetivoVacio,
} from '../../data/objetivo-nutricional-campos';
import { PERFILES_EJEMPLO_OBJETIVO, PerfilEjemploObjetivo } from '../../data/perfiles-ejemplo-objetivo';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-objetivo-nutricional',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    CompradorNavComponent,
    LogoutButtonComponent,
  ],
  templateUrl: './objetivo-nutricional.component.html',
})
export class ObjetivoNutricionalComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly objetivoService = inject(ObjetivoNutricionalService);

  readonly campos = CAMPOS_OBJETIVO_NUTRICIONAL;
  readonly perfiles = PERFILES_EJEMPLO_OBJETIVO;

  valores: ObjetivoNutricionalValores = objetivoVacio();
  errores = signal<Record<string, string>>({});
  perfilSeleccionado = '';
  validando = signal(false);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/objetivo-nutricional' } });
      return;
    }
    if (this.auth.esAdministrador()) {
      void this.router.navigate(['/gestion-administrador']);
      return;
    }
    if (!this.auth.esUsuarioFormulacion()) {
      void this.router.navigate(['/login']);
      return;
    }
    const guardado = this.objetivoService.leerSesion();
    if (guardado) {
      this.valores = { ...objetivoVacio(), ...guardado };
    }
  }

  errorCampo(campo: CampoObjetivoDef): string | null {
    return this.errores()[campo.key] ?? null;
  }

  validarCampo(campo: CampoObjetivoDef): void {
    const err = this.validarValor(campo, this.valores[campo.key]);
    const actuales = { ...this.errores() };
    if (err) {
      actuales[campo.key] = err;
    } else {
      delete actuales[campo.key];
    }
    this.errores.set(actuales);
  }

  cargarPerfilEjemplo(): void {
    const perfil = this.perfiles.find((p) => p.id === this.perfilSeleccionado);
    if (!perfil) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Selecciona un perfil',
        mensaje: 'Elige uno de los perfiles de ejemplo antes de cargar.',
      });
      return;
    }
    this.valores = { ...perfil.valores };
    this.errores.set({});
    this.modal.set({
      tipo: 'ok',
      titulo: 'Perfil cargado',
      mensaje: `Se aplicaron los valores de «${perfil.nombre}».`,
    });
  }

  enviarObjetivo(): void {
    const erroresLocales: Record<string, string> = {};
    for (const campo of this.campos) {
      const err = this.validarValor(campo, this.valores[campo.key]);
      if (err) {
        erroresLocales[campo.key] = err;
      }
    }
    if (Object.keys(erroresLocales).length > 0) {
      this.errores.set(erroresLocales);
      this.modal.set({
        tipo: 'error',
        titulo: 'Revisa el formulario',
        mensaje: 'Hay campos con errores. Corrige los valores indicados debajo de cada campo.',
      });
      return;
    }

    this.validando.set(true);
    this.objetivoService.validar(this.valores).subscribe({
      next: (res) => {
        this.validando.set(false);
        if (!res.valido) {
          this.errores.set(res.errores ?? {});
          this.modal.set({
            tipo: 'error',
            titulo: 'Validación',
            mensaje: res.message || 'Corrige los campos indicados.',
          });
          return;
        }
        this.errores.set({});
        this.objetivoService.guardarSesion(this.valores);
        this.modal.set({
          tipo: 'ok',
          titulo: 'Objetivo registrado',
          mensaje: res.message || 'El objetivo nutricional es válido y está listo para la formulación.',
        });
      },
      error: (err) => {
        this.validando.set(false);
        const erroresApi = err?.error?.errores as Record<string, string> | undefined;
        if (erroresApi) {
          this.errores.set(erroresApi);
        }
        this.modal.set({
          tipo: 'error',
          titulo: 'Error de validación',
          mensaje: err?.error?.message || 'No se pudo validar el objetivo nutricional.',
        });
      },
    });
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  iconoPerfil(p: PerfilEjemploObjetivo): string {
    return p.icon;
  }

  private validarValor(campo: CampoObjetivoDef, valor: number | null): string | null {
    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return `${campo.label}: el campo no puede estar en blanco.`;
    }
    const n = Number(valor);
    if (Number.isNaN(n)) {
      return `${campo.label}: debe ser un valor numérico válido.`;
    }
    if (n < 0) {
      return `${campo.label}: debe ser un valor numérico no negativo.`;
    }
    return null;
  }
}
