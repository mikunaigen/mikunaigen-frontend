import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { AlternativaRecetaDto } from '../../services/formulacion-inferencia.service';

type FilaCodex = {
  nutriente: string;
  logrado: number;
  limiteCodex: number;
  cumple: boolean;
  referencia: string;
};

type FilaLey = {
  nutriente: string;
  logrado: number;
  umbralLey: number;
  activaOctogono: boolean;
  octogono: string;
  referencia: string;
};

@Component({
  selector: 'app-semaforo-normativo',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './semaforo-normativo.component.html',
})
export class SemaforoNormativoComponent {
  @Input({ required: true }) alternativa!: AlternativaRecetaDto;
  @Input({ required: true }) rol!: string;
  @Input() leyUrl = 'https://spij.minjus.gob.pe/spij-ext-web/#/detallenorma/H1078784';

  tooltipActivo = signal<string | null>(null);
  panelExtendido = signal(false);

  clavesSemaforo = ['sodio_mg', 'grasa_total_g', 'carbohidratos_disponibles_g'];

  esNutricionista(): boolean {
    return this.rol === 'nutricionista';
  }

  colorClase(color?: string): string {
    if (color === 'ROJO') return 'bg-red-500';
    if (color === 'AMARILLO') return 'bg-amber-400';
    return 'bg-green-500';
  }

  etiquetaNutriente(key: string): string {
    const det = this.alternativa.semaforoDetalle?.[key] as Record<string, unknown> | undefined;
    if (det?.['etiqueta']) return String(det['etiqueta']);
    return key.replace(/_mg|_g|_kcal|_ug/g, '').replace(/_/g, ' ');
  }

  valorLogrado(key: string): string {
    const val = this.alternativa.perfilNutricional?.[key]?.logrado;
    return val != null ? String(val) : '—';
  }

  textoTooltip(key: string): string {
    if (this.esNutricionista()) {
      const det = this.alternativa.semaforoDetalle?.[key] as Record<string, unknown> | undefined;
      if (det) {
        return `Valor: ${det['valor'] ?? this.valorLogrado(key)} · Umbral: ${det['umbral'] ?? '—'} · ${det['referencia'] ?? 'Ley N° 30021'}`;
      }
    }
    return `Valor: ${this.valorLogrado(key)} · Detalle normativo disponible en Plan Nutricionista`;
  }

  filasCodex(): FilaCodex[] {
    const ext = this.alternativa.semaforoExtendido as { verificacionCodex?: FilaCodex[] } | undefined;
    return ext?.verificacionCodex ?? [];
  }

  filasLey(): FilaLey[] {
    const ext = this.alternativa.semaforoExtendido as { verificacionLey30021?: FilaLey[] } | undefined;
    return ext?.verificacionLey30021 ?? [];
  }

  alternarExtendido(): void {
    if (!this.esNutricionista()) return;
    this.panelExtendido.update((v) => !v);
  }

  mostrarTooltip(key: string): void {
    this.tooltipActivo.set(key);
  }

  ocultarTooltip(): void {
    this.tooltipActivo.set(null);
  }
}
