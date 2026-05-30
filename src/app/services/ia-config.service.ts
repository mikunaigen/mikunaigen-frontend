import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface IaEstado {
  iaActiva: boolean;
  slot1Enabled: boolean;
  slot2Enabled: boolean;
  slot1Activo: boolean;
  slot2Activo: boolean;
}

const ESTADO_INICIAL: IaEstado = {
  iaActiva: false,
  slot1Enabled: false,
  slot2Enabled: false,
  slot1Activo: false,
  slot2Activo: false,
};

@Injectable({ providedIn: 'root' })
export class IaConfigService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl + '/ia-modelos/estado';

  readonly estado = signal<IaEstado>({ ...ESTADO_INICIAL });

  slot1Activo(): boolean {
    return this.estado().slot1Activo;
  }

  slot2Activo(): boolean {
    return this.estado().slot2Activo;
  }

  cargar(): void {
    this.http.get<Partial<IaEstado>>(this.api).subscribe({
      next: (r) => this.aplicar(r),
      error: () => this.estado.set({ ...ESTADO_INICIAL }),
    });
  }

  aplicarDesdeAdmin(resp: { iaActiva?: boolean; slots?: { slotNumber: number; slotEnabled?: boolean }[] }): void {
    const slots = Array.isArray(resp?.slots) ? resp.slots : [];
    const slot1 = slots.find((s) => s.slotNumber === 1)?.slotEnabled ?? false;
    const slot2 = slots.find((s) => s.slotNumber === 2)?.slotEnabled ?? false;
    const iaActiva = !!resp?.iaActiva;
    this.estado.set({
      iaActiva,
      slot1Enabled: slot1,
      slot2Enabled: slot2,
      slot1Activo: iaActiva && slot1,
      slot2Activo: iaActiva && slot2,
    });
  }

  private aplicar(r: Partial<IaEstado>): void {
    const iaActiva = !!r?.iaActiva;
    const slot1Enabled = !!r?.slot1Enabled;
    const slot2Enabled = !!r?.slot2Enabled;
    this.estado.set({
      iaActiva,
      slot1Enabled,
      slot2Enabled,
      slot1Activo: r?.slot1Activo ?? (iaActiva && slot1Enabled),
      slot2Activo: r?.slot2Activo ?? (iaActiva && slot2Enabled),
    });
  }
}
