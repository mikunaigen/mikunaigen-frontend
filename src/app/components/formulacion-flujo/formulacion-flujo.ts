import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../services/auth.service';
import {
  FormulacionInferenciaService,
  UltimaConfiguracionFormulacionDto,
} from '../../services/formulacion-inferencia.service';
import { ObjetivoNutricionalService } from '../../services/objetivo-nutricional.service';
import { ParametrizacionFormulacionService, ParametrizacionDto } from '../../services/parametrizacion-formulacion.service';
import { ObjetivoNutricionalValores } from '../../data/objetivo-nutricional-campos';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { ObjetivoNutricionalComponent } from '../objetivo-nutricional/objetivo-nutricional';
import { ParametrizacionFormulacionComponent } from '../parametrizacion-formulacion/parametrizacion-formulacion';
import { FormularRecetaComponent } from '../formular-receta/formular-receta';

export type PestanaFormulacion = 'objetivo' | 'parametrizacion' | 'formular';

@Component({
  selector: 'app-formulacion-flujo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgIconComponent,
    CompradorNavComponent,
    LogoutButtonComponent,
    ObjetivoNutricionalComponent,
    ParametrizacionFormulacionComponent,
    FormularRecetaComponent,
  ],
  templateUrl: './formulacion-flujo.component.html',
})
export class FormulacionFlujoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly inferenciaService = inject(FormulacionInferenciaService);
  private readonly objetivoService = inject(ObjetivoNutricionalService);
  private readonly parametrizacionService = inject(ParametrizacionFormulacionService);

  @ViewChild(ObjetivoNutricionalComponent) objetivoCmp?: ObjetivoNutricionalComponent;
  @ViewChild(ParametrizacionFormulacionComponent) parametrizacionCmp?: ParametrizacionFormulacionComponent;

  pestanaActual = signal<PestanaFormulacion>('objetivo');
  cargandoValoresAnteriores = signal(false);
  modal = signal<{ tipo: 'ok' | 'error'; titulo: string; mensaje: string } | null>(null);

  readonly pasos: { id: PestanaFormulacion; numero: number; titulo: string; icono: string }[] = [
    { id: 'objetivo', numero: 1, titulo: 'Objetivo nutricional', icono: 'heroBeaker' },
    { id: 'parametrizacion', numero: 2, titulo: 'Parametrización', icono: 'heroAdjustmentsHorizontal' },
    { id: 'formular', numero: 3, titulo: 'Formular', icono: 'heroSparkles' },
  ];

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/formular' } });
      return;
    }
    if (this.auth.esAdministrador() || !this.auth.esUsuarioFormulacion()) {
      void this.router.navigate(['/login']);
      return;
    }

    const tabQuery = this.route.snapshot.queryParamMap.get('tab') as PestanaFormulacion | null;
    const path = this.router.url.split('?')[0];
    if (path.endsWith('/parametrizacion')) {
      this.pestanaActual.set('parametrizacion');
    } else if (path.endsWith('/formular') && tabQuery === 'formular') {
      this.pestanaActual.set('formular');
    } else if (path.endsWith('/formular') && tabQuery === 'parametrizacion') {
      this.pestanaActual.set('parametrizacion');
    } else if (tabQuery === 'parametrizacion' || tabQuery === 'formular' || tabQuery === 'objetivo') {
      this.pestanaActual.set(tabQuery);
    } else {
      this.pestanaActual.set('objetivo');
    }

    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as PestanaFormulacion | null;
      if (t === 'parametrizacion' || t === 'formular' || t === 'objetivo') {
        this.pestanaActual.set(t);
      }
    });
  }

  cambiarPestana(pestana: PestanaFormulacion): void {
    if (pestana === 'formular' && !this.pasosCompletos()) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Pasos incompletos',
        mensaje: 'Completa y guarda el objetivo nutricional y la parametrización antes de formular.',
      });
      return;
    }
    this.pestanaActual.set(pestana);
    void this.router.navigate(['/formular'], {
      queryParams: { tab: pestana },
    });
  }

  continuarAPaso2(): void {
    this.objetivoCmp?.guardarParaContinuar();
  }

  onObjetivoGuardado(): void {
    this.cambiarPestana('parametrizacion');
  }

  irAFormular(): void {
    if (!this.objetivoService.leerSesion()) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Paso 1 pendiente',
        mensaje: 'Debes confirmar el objetivo nutricional antes de formular.',
      });
      this.pestanaActual.set('objetivo');
      return;
    }
    this.parametrizacionCmp?.guardarParaContinuar();
  }

  onParametrizacionGuardada(): void {
    if (!this.objetivoService.leerSesion()) {
      this.modal.set({
        tipo: 'error',
        titulo: 'Paso 1 pendiente',
        mensaje: 'Debes confirmar el objetivo nutricional antes de formular.',
      });
      this.pestanaActual.set('objetivo');
      return;
    }
    this.cambiarPestana('formular');
  }

  cargarValoresAnteriores(): void {
    this.cargandoValoresAnteriores.set(true);
    this.inferenciaService.ultimaConfiguracion().subscribe({
      next: (res) => {
        this.cargandoValoresAnteriores.set(false);
        if (!res.disponible) {
          this.modal.set({
            tipo: 'error',
            titulo: 'Sin historial',
            mensaje: res.message || 'No hay formulaciones anteriores registradas.',
          });
          return;
        }
        this.aplicarValoresAnteriores(res);
      },
      error: (err) => {
        this.cargandoValoresAnteriores.set(false);
        this.modal.set({
          tipo: 'error',
          titulo: 'Error',
          mensaje: err?.error?.message || 'No se pudieron cargar los valores anteriores.',
        });
      },
    });
  }

  private aplicarValoresAnteriores(res: UltimaConfiguracionFormulacionDto): void {
    if (res.objetivo) {
      this.objetivoService.guardarSesion(res.objetivo as ObjetivoNutricionalValores);
      this.objetivoCmp?.recargarDesdeSesion();
    }
    if (res.parametrizacion) {
      this.parametrizacionService.guardarSesion(res.parametrizacion as ParametrizacionDto);
      this.parametrizacionCmp?.aplicarParametrizacion(res.parametrizacion as ParametrizacionDto);
    }
    this.modal.set({
      tipo: 'ok',
      titulo: 'Valores cargados',
      mensaje: 'Se aplicaron los parámetros de tu última formulación. Revisa los pasos 1 y 2 antes de continuar.',
    });
    this.pestanaActual.set('objetivo');
    void this.router.navigate(['/formular'], { queryParams: { tab: 'objetivo' } });
  }

  pasosCompletos(): boolean {
    return this.objetivoService.leerSesion() !== null && this.parametrizacionService.leerSesion() !== null;
  }

  pasoActivo(id: PestanaFormulacion): boolean {
    return this.pestanaActual() === id;
  }

  pasoCompletado(id: PestanaFormulacion): boolean {
    if (id === 'objetivo') {
      return this.objetivoService.leerSesion() !== null;
    }
    if (id === 'parametrizacion') {
      return this.parametrizacionService.leerSesion() !== null;
    }
    return false;
  }

  cerrarModal(): void {
    this.modal.set(null);
  }
}
