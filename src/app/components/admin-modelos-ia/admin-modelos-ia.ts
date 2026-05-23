import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment';
import { IaConfigService } from '../../services/ia-config.service';

type SlotEstado = 'VACIO' | 'CARGANDO' | 'ACTIVO';

interface IaSlot {
  slotNumber: number;
  titulo: string;
  status: SlotEstado;
  slotEnabled?: boolean;
  modelFileName?: string;
  encodersFileName?: string;
  rulesFileName?: string;
  frequencyFileName?: string;
  configFileName?: string;
  featScalerFileName?: string;
  yScalerFileName?: string;
  metaModeloFileName?: string;
  uploadedAt?: string;
}

@Component({
  selector: 'app-admin-modelos-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './admin-modelos-ia.component.html',
})
export class AdminModelosIaComponent implements OnInit, OnDestroy {
  private readonly apiIa = environment.apiUrl + '/ia-modelos';
  private wsDatasetSub?: Subscription;
  private pollDatasetTimer: ReturnType<typeof setInterval> | null = null;
  private datasetJobId: string | null = null;

  cargandoIa = false;
  guardandoIa = false;
  descargandoDataset: number | null = null;
  iaActiva = false;
  slotsIa: IaSlot[] = [];
  archivoModeloIa: File | null = null;
  archivoEncodersIa: File | null = null;
  archivoRulesSlot2: File | null = null;
  archivoFrequencySlot2: File | null = null;
  archivoConfigSlot2: File | null = null;
  archivoModeloSlot3: File | null = null;
  archivoFeatScalerSlot3: File | null = null;
  archivoYScalerSlot3: File | null = null;
  archivoMetaSlot3: File | null = null;
  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '' };
  modalDataset = {
    visible: false,
    fase: 'pendiente' as 'pendiente' | 'listo' | 'error',
    slot: 0,
    fileName: '',
    downloadUrl: '',
    mensaje: '',
  };

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private iaConfig: IaConfigService,
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracionIa();
    this.wsDatasetSub = this.websocketService
      .subscribeToTopic('/topic/admin/dataset')
      .subscribe((raw) => this.onDatasetWs(raw));
  }

  ngOnDestroy(): void {
    this.detenerPollingDataset();
    this.wsDatasetSub?.unsubscribe();
  }

  descargarDataset(slotNumber: number) {
    if (slotNumber < 1 || slotNumber > 3) {
      return;
    }
    this.detenerPollingDataset();
    this.descargandoDataset = slotNumber;
    this.http
      .post<{ message?: string; fileName?: string; jobId?: string }>(
        `${this.apiIa}/dataset/${slotNumber}/solicitar`,
        {},
      )
      .subscribe({
        next: (resp) => {
          this.ngZone.run(() => {
            this.datasetJobId = resp?.jobId ?? null;
            const fileName =
              resp?.fileName || `dataset_modelo_${String(slotNumber).padStart(2, '0')}.zip`;
            this.modalDataset = {
              visible: true,
              fase: 'pendiente',
              slot: slotNumber,
              fileName,
              downloadUrl: '',
              mensaje:
                resp?.message ||
                'Generando dataset... Te avisaremos cuando esté listo.',
            };
            this.iniciarPollingDataset();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.descargandoDataset = null;
            this.datasetJobId = null;
            this.abrirModal(
              'error',
              'Dataset',
              err?.error?.message || 'No se pudo iniciar la generación del dataset.',
            );
            this.cdr.detectChanges();
          });
        },
      });
  }

  cerrarModalDataset() {
    this.modalDataset.visible = false;
    if (this.modalDataset.fase !== 'pendiente') {
      this.descargandoDataset = null;
      this.datasetJobId = null;
      this.detenerPollingDataset();
    }
    this.cdr.detectChanges();
  }

  private iniciarPollingDataset() {
    this.detenerPollingDataset();
    if (!this.datasetJobId) {
      return;
    }
    this.consultarEstadoDataset();
    this.pollDatasetTimer = setInterval(() => this.consultarEstadoDataset(), 3000);
  }

  private detenerPollingDataset() {
    if (this.pollDatasetTimer != null) {
      clearInterval(this.pollDatasetTimer);
      this.pollDatasetTimer = null;
    }
  }

  private consultarEstadoDataset() {
    if (!this.datasetJobId) {
      return;
    }
    this.http
      .get<{
        status?: string;
        slot?: number;
        fileName?: string;
        downloadUrl?: string;
        message?: string;
      }>(`${this.apiIa}/dataset/jobs/${this.datasetJobId}`)
      .subscribe({
        next: (estado) => {
          this.ngZone.run(() => {
            this.aplicarEstadoDataset(estado);
            this.cdr.detectChanges();
          });
        },
        error: () => {},
      });
  }

  private aplicarEstadoDataset(estado: {
    status?: string;
    slot?: number;
    fileName?: string;
    downloadUrl?: string;
    message?: string;
  }) {
    const status = String(estado?.status || '').toUpperCase();
    const slot = Number(estado?.slot || this.modalDataset.slot || 0);
    const fileName =
      estado?.fileName ||
      `dataset_modelo_${String(slot || 1).padStart(2, '0')}.zip`;

    if (status === 'READY' && estado?.downloadUrl) {
      this.detenerPollingDataset();
      this.descargandoDataset = null;
      this.modalDataset = {
        visible: true,
        fase: 'listo',
        slot,
        fileName,
        downloadUrl: estado.downloadUrl,
        mensaje: 'El dataset está listo para descargar.',
      };
      return;
    }

    if (status === 'FAILED') {
      this.detenerPollingDataset();
      this.descargandoDataset = null;
      this.modalDataset = {
        visible: true,
        fase: 'error',
        slot,
        fileName,
        downloadUrl: '',
        mensaje: estado?.message || 'No se pudo generar el dataset.',
      };
    }
  }

  private onDatasetWs(raw: string) {
    this.ngZone.run(() => {
      try {
        const o = JSON.parse(raw) as {
          kind?: string;
          jobId?: string;
          slot?: number;
          fileName?: string;
          downloadUrl?: string;
          message?: string;
        };
        if (this.datasetJobId && o.jobId && o.jobId !== this.datasetJobId) {
          return;
        }
        const slot = Number(o.slot || 0);
        if (!slot) {
          return;
        }
        if (o.kind === 'dataset_ready' && o.downloadUrl) {
          this.detenerPollingDataset();
          this.descargandoDataset = null;
          this.modalDataset = {
            visible: true,
            fase: 'listo',
            slot,
            fileName: o.fileName || `dataset_modelo_${String(slot).padStart(2, '0')}.zip`,
            downloadUrl: o.downloadUrl,
            mensaje: 'El dataset está listo para descargar.',
          };
          this.cdr.detectChanges();
          return;
        }
        if (o.kind === 'dataset_failed') {
          this.detenerPollingDataset();
          this.descargandoDataset = null;
          this.modalDataset = {
            visible: true,
            fase: 'error',
            slot,
            fileName: o.fileName || `dataset_modelo_${String(slot).padStart(2, '0')}.zip`,
            downloadUrl: '',
            mensaje: o.message || 'No se pudo generar el dataset.',
          };
          this.cdr.detectChanges();
        }
      } catch {
        return;
      }
    });
  }

  cargarConfiguracionIa() {
    this.cargandoIa = true;
    this.http.get<any>(`${this.apiIa}`).subscribe({
      next: (resp) => {
        this.cargandoIa = false;
        this.aplicarRespuestaIa(resp);
      },
      error: () => {
        this.cargandoIa = false;
        this.abrirModal('error', 'IA', 'No se pudo cargar la configuración de modelos IA.');
      },
    });
  }

  private aplicarRespuestaIa(resp: { iaActiva?: boolean; slots?: IaSlot[] }): void {
    this.iaActiva = !!resp?.iaActiva;
    this.slotsIa = Array.isArray(resp?.slots) ? resp.slots : [];
    this.iaConfig.aplicarDesdeAdmin(resp);
  }

  onArchivoModeloIaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.keras')) {
      this.abrirModal('error', 'Archivo inválido', 'Solo se permite archivo .keras para el modelo.');
      input.value = '';
      this.archivoModeloIa = null;
      return;
    }
    this.archivoModeloIa = file;
  }

  onArchivoEncodersIaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.abrirModal('error', 'Archivo inválido', 'Solo se permite archivo .json para encoders.');
      input.value = '';
      this.archivoEncodersIa = null;
      return;
    }
    this.archivoEncodersIa = file;
  }

  async guardarModeloIaSlot1() {
    if (!this.archivoModeloIa || !this.archivoEncodersIa) {
      this.abrirModal(
        'error',
        'Archivos requeridos',
        'Debes cargar el archivo .keras y el archivo .json.',
      );
      return;
    }
    this.guardandoIa = true;
    try {
      const modelFileBase64 = await this.fileToBase64(this.archivoModeloIa);
      const encodersFileBase64 = await this.fileToBase64(this.archivoEncodersIa);
      this.http
        .post<any>(`${this.apiIa}/slot-1/upload`, {
          modelFileName: this.archivoModeloIa.name,
          modelFileBase64,
          encodersFileName: this.archivoEncodersIa.name,
          encodersFileBase64,
        })
        .subscribe({
          next: (resp) => {
            this.guardandoIa = false;
            this.aplicarRespuestaIa(resp);
            this.archivoModeloIa = null;
            this.archivoEncodersIa = null;
            this.abrirModal('exito', 'IA', 'Modelo y encoders cargados correctamente en Slot 1.');
          },
          error: (err) => {
            this.guardandoIa = false;
            this.abrirModal('error', 'IA', err?.error?.message || 'No se pudo cargar el modelo IA.');
          },
        });
    } catch {
      this.guardandoIa = false;
      this.abrirModal('error', 'IA', 'No se pudo procesar el archivo seleccionado.');
    }
  }

  actualizarSwitchIa() {
    const valor = this.iaActiva;
    this.slotsIa = this.slotsIa.map((s) =>
      s.slotNumber >= 1 && s.slotNumber <= 3 ? { ...s, slotEnabled: valor } : s,
    );
    this.guardandoIa = true;
    this.http.patch<any>(`${this.apiIa}/toggle`, { iaActiva: valor }).subscribe({
      next: (resp) => {
        this.guardandoIa = false;
        this.aplicarRespuestaIa(resp);
      },
      error: () => {
        this.guardandoIa = false;
        this.iaActiva = !valor;
        this.cargarConfiguracionIa();
        this.abrirModal('error', 'IA', 'No se pudo actualizar el interruptor maestro de IA.');
      },
    });
  }

  actualizarSwitchSlot(slotNumber: number, enabled: boolean) {
    this.guardandoIa = true;
    this.http.patch<any>(`${this.apiIa}/slot/${slotNumber}/toggle`, { enabled }).subscribe({
      next: (resp) => {
        this.guardandoIa = false;
        this.aplicarRespuestaIa(resp);
      },
      error: () => {
        this.guardandoIa = false;
        this.cargarConfiguracionIa();
        this.abrirModal('error', 'IA', 'No se pudo actualizar el interruptor del slot.');
      },
    });
  }

  onArchivoRulesSlot2Selected(event: Event) {
    this.archivoRulesSlot2 = this.validarJsonFile(event, 'rules.json');
  }

  onArchivoFrequencySlot2Selected(event: Event) {
    this.archivoFrequencySlot2 = this.validarJsonFile(event, 'frequency.json');
  }

  onArchivoConfigSlot2Selected(event: Event) {
    this.archivoConfigSlot2 = this.validarJsonFile(event, 'config.json');
  }

  async guardarPaqueteSlot2() {
    if (!this.archivoRulesSlot2 || !this.archivoFrequencySlot2 || !this.archivoConfigSlot2) {
      this.abrirModal(
        'error',
        'Archivos requeridos',
        'Debes cargar rules.json, frequency.json y config.json para el Slot 2.',
      );
      return;
    }
    this.guardandoIa = true;
    try {
      const rulesFileBase64 = await this.fileToBase64(this.archivoRulesSlot2);
      const frequencyFileBase64 = await this.fileToBase64(this.archivoFrequencySlot2);
      const configFileBase64 = await this.fileToBase64(this.archivoConfigSlot2);
      this.http
        .post<any>(`${this.apiIa}/slot-2/upload`, {
          rulesFileName: this.archivoRulesSlot2.name,
          rulesFileBase64,
          frequencyFileName: this.archivoFrequencySlot2.name,
          frequencyFileBase64,
          configFileName: this.archivoConfigSlot2.name,
          configFileBase64,
        })
        .subscribe({
          next: (resp) => {
            this.guardandoIa = false;
            this.aplicarRespuestaIa(resp);
            this.archivoRulesSlot2 = null;
            this.archivoFrequencySlot2 = null;
            this.archivoConfigSlot2 = null;
            this.abrirModal('exito', 'Slot 2', 'Paquete de venta cruzada cargado correctamente.');
          },
          error: (err) => {
            this.guardandoIa = false;
            this.abrirModal('error', 'Slot 2', err?.error?.message || 'No se pudo cargar el paquete.');
          },
        });
    } catch {
      this.guardandoIa = false;
      this.abrirModal('error', 'Slot 2', 'No se pudo procesar el archivo seleccionado.');
    }
  }

  async guardarSlot3() {
    if (
      !this.archivoModeloSlot3 ||
      !this.archivoFeatScalerSlot3 ||
      !this.archivoYScalerSlot3 ||
      !this.archivoMetaSlot3
    ) {
      this.abrirModal('error', 'Archivos requeridos', 'Debes cargar los cuatro archivos del Slot 3.');
      return;
    }
    this.guardandoIa = true;
    try {
      const modelFileBase64 = await this.fileToBase64(this.archivoModeloSlot3);
      const featScalerBase64 = await this.fileToBase64(this.archivoFeatScalerSlot3);
      const yScalerBase64 = await this.fileToBase64(this.archivoYScalerSlot3);
      const metaModeloBase64 = await this.fileToBase64(this.archivoMetaSlot3);
      this.http
        .post<any>(`${this.apiIa}/slot-3/upload`, {
          modelFileName: this.archivoModeloSlot3.name,
          modelFileBase64,
          featScalerFileName: this.archivoFeatScalerSlot3.name,
          featScalerBase64,
          yScalerFileName: this.archivoYScalerSlot3.name,
          yScalerBase64,
          metaModeloFileName: this.archivoMetaSlot3.name,
          metaModeloBase64,
        })
        .subscribe({
          next: (resp) => {
            this.guardandoIa = false;
            this.aplicarRespuestaIa(resp);
            this.archivoModeloSlot3 = null;
            this.archivoFeatScalerSlot3 = null;
            this.archivoYScalerSlot3 = null;
            this.archivoMetaSlot3 = null;
            this.abrirModal('exito', 'Slot 3', 'Paquete de predicción de inventario cargado correctamente.');
          },
          error: (err) => {
            this.guardandoIa = false;
            this.abrirModal('error', 'Slot 3', err?.error?.message || 'No se pudo cargar el paquete.');
          },
        });
    } catch {
      this.guardandoIa = false;
      this.abrirModal('error', 'Slot 3', 'No se pudo procesar el archivo seleccionado.');
    }
  }

  onArchivoModeloSlot3(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.keras')) {
      this.abrirModal('error', 'Archivo inválido', 'Solo se permite archivo .keras.');
      input.value = '';
      this.archivoModeloSlot3 = null;
      return;
    }
    this.archivoModeloSlot3 = file;
  }

  onArchivoFeatScalerSlot3(event: Event) {
    this.archivoFeatScalerSlot3 = this.validarPklFile(event, 'feat_scaler.pkl');
  }

  onArchivoYScalerSlot3(event: Event) {
    this.archivoYScalerSlot3 = this.validarPklFile(event, 'y_scaler.pkl');
  }

  onArchivoMetaSlot3(event: Event) {
    this.archivoMetaSlot3 = this.validarJsonFile(event, 'meta_modelo.json');
  }

  private validarPklFile(event: Event, etiqueta: string): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return null;
    if (!file.name.toLowerCase().endsWith('.pkl')) {
      this.abrirModal('error', 'Archivo inválido', `${etiqueta} debe ser .pkl.`);
      input.value = '';
      return null;
    }
    return file;
  }

  textoEstadoSlot(status: SlotEstado): string {
    if (status === 'ACTIVO') return 'ACTIVO';
    if (status === 'CARGANDO') return 'CARGANDO';
    return 'VACIO';
  }

  claseEstadoSlot(status: SlotEstado): string {
    if (status === 'ACTIVO') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:text-emerald-200';
    }
    if (status === 'CARGANDO') {
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-200';
    }
    return 'border-gray-200 bg-gray-100 text-neutral-strong dark:border-dark-border dark:bg-slate-900 dark:text-dark-text-muted';
  }

  abrirModal(tipo: string, titulo: string, mensaje: string) {
    this.modal = { visible: true, tipo, titulo, mensaje };
  }

  cerrarModal() {
    this.modal.visible = false;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer archivo.'));
      reader.readAsDataURL(file);
    });
  }

  private validarJsonFile(event: Event, esperado: string): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return null;
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.abrirModal('error', 'Archivo inválido', `El archivo ${esperado} debe ser .json.`);
      input.value = '';
      return null;
    }
    return file;
  }
}
