import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-imagen-preview',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './imagen-preview.component.html',
})
export class ImagenPreviewComponent implements OnChanges, OnDestroy {
  @Input() src: string | null = null;
  @Input() nombreArchivo = '';
  @Input() editable = false;
  @Input() etiqueta = 'Comprobante de pago';
  @Input() hint = 'PNG o JPG, máx. 2 MB';
  @Input() accept = '.png,.jpg,.jpeg,image/png,image/jpeg';
  @Input() maxSizeMb = 2;

  @Output() archivoChange = new EventEmitter<File | null>();
  @Output() errorValidacion = new EventEmitter<string>();

  vistaSrc = signal<string | null>(null);
  zoomAbierto = signal(false);
  zoomNivel = signal(1);
  errorLocal = signal('');

  private urlInterna: string | null = null;
  private urlPropia = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !this.urlPropia) {
      this.vistaSrc.set(this.src);
    }
  }

  ngOnDestroy(): void {
    this.liberarUrlInterna();
  }

  onArchivoSeleccionado(event: Event): void {
    this.errorLocal.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const nombre = file.name.toLowerCase();
    if (!nombre.endsWith('.png') && !nombre.endsWith('.jpg') && !nombre.endsWith('.jpeg')) {
      const msg = 'Solo se permiten imágenes PNG o JPG.';
      this.errorLocal.set(msg);
      this.errorValidacion.emit(msg);
      input.value = '';
      return;
    }
    const maxBytes = this.maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `El archivo no debe superar los ${this.maxSizeMb} MB.`;
      this.errorLocal.set(msg);
      this.errorValidacion.emit(msg);
      input.value = '';
      return;
    }
    this.establecerArchivo(file);
    input.value = '';
  }

  abrirZoom(): void {
    if (!this.vistaSrc()) {
      return;
    }
    this.zoomNivel.set(1);
    this.zoomAbierto.set(true);
  }

  cerrarZoom(): void {
    this.zoomAbierto.set(false);
    this.zoomNivel.set(1);
  }

  acercar(): void {
    this.zoomNivel.update((z) => Math.min(Number((z + 0.25).toFixed(2)), 3));
  }

  alejar(): void {
    this.zoomNivel.update((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
  }

  restablecerZoom(): void {
    this.zoomNivel.set(1);
  }

  eliminar(): void {
    this.liberarUrlInterna();
    this.vistaSrc.set(null);
    this.archivoChange.emit(null);
    this.errorLocal.set('');
  }

  dispararSelector(): void {
    const el = document.getElementById(this.inputId) as HTMLInputElement | null;
    el?.click();
  }

  readonly inputId = `imagen-preview-${Math.random().toString(36).slice(2, 9)}`;

  private establecerArchivo(file: File): void {
    this.liberarUrlInterna();
    this.urlInterna = URL.createObjectURL(file);
    this.urlPropia = true;
    this.vistaSrc.set(this.urlInterna);
    this.archivoChange.emit(file);
  }

  private liberarUrlInterna(): void {
    if (this.urlPropia && this.urlInterna) {
      URL.revokeObjectURL(this.urlInterna);
    }
    this.urlInterna = null;
    this.urlPropia = false;
  }
}
