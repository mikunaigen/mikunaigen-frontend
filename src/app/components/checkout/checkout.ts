import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { CompradorNavComponent } from '../comprador-nav/comprador-nav';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ConfigService, type ConfiguracionNegocioDto } from '../../services/config.service';
import { environment } from '@env/environment'; 

const API_PEDIDOS = environment.apiUrl + '/pedidos';

const MAX_BYTES = 3 * 1024 * 1024;
const MIME_OK = ['image/jpeg', 'image/jpg', 'image/png'];

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, CompradorNavComponent],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  private readonly configService = inject(ConfigService);

  config: ConfiguracionNegocioDto | null = null;
  resumenAbierto = true;

  archivo: File | null = null;
  previewUrl: string | null = null;

  enviando = false;

  modal = { visible: false, tipo: 'error' as 'error' | 'success', titulo: '', mensaje: '' };

  readonly dragActivo = signal(false);

  ngOnInit(): void {
    const s = this.auth.getSession();
    if (s?.role !== 'CLIENTE' || !s.userId) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.cart.cargarDesdeServidor(s.userId).subscribe(() => {
      if (this.cart.items().length === 0) {
        void this.router.navigate(['/menu']);
      }
    });
    this.configService.obtenerConfiguracion().subscribe({
      next: (c) => (this.config = c),
      error: () => (this.config = null),
    });
  }

  toggleResumen(): void {
    this.resumenAbierto = !this.resumenAbierto;
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) {
      this.validarYAsignar(f);
    }
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragActivo.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) {
      this.validarYAsignar(f);
    }
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragActivo.set(true);
  }

  onDragLeave(): void {
    this.dragActivo.set(false);
  }

  private validarYAsignar(f: File): void {
    this.liberarPreview();
    const type = (f.type || '').toLowerCase();
    const okMime = MIME_OK.some((m) => type === m || (m === 'image/jpg' && type === 'image/jpeg'));
    if (!okMime) {
      this.abrirModal('error', 'Formato no admitido', 'Solo se permiten imágenes en formato JPG o PNG.');
      return;
    }
    if (f.size > MAX_BYTES) {
      this.abrirModal('error', 'Archivo demasiado grande', 'La imagen no debe pesar más de 3MB.');
      return;
    }
    this.archivo = f;
    this.previewUrl = URL.createObjectURL(f);
  }

  private liberarPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  quitarArchivo(): void {
    this.archivo = null;
    this.liberarPreview();
  }

  abrirModal(tipo: 'error' | 'success', titulo: string, mensaje: string): void {
    this.modal = { visible: true, tipo, titulo, mensaje };
  }

  cerrarModal(): void {
    this.modal.visible = false;
  }

  formatoMoneda(v: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
  }

  get mp() {
    return this.config?.mediosPago;
  }

  confirmarPedido(): void {
    if (!this.archivo) {
      this.abrirModal('error', 'Comprobante requerido', 'Adjunta el comprobante de pago.');
      return;
    }
    const uid = this.auth.getSession()?.userId;
    if (!uid) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.enviando = true;
    const fd = new FormData();
    fd.append('userId', uid);
    fd.append('comprobante', this.archivo, this.archivo.name);
    this.http.post<{ orderId?: string }>(`${API_PEDIDOS}/checkout`, fd).subscribe({
      next: () => {
        this.enviando = false;
        this.cart.limpiarLocal();
        this.cart.clearPriceSnapshot();
        void this.router.navigate(['/pedido-enviado']);
      },
      error: (err) => {
        this.enviando = false;
        this.abrirModal(
          'error',
          'No se pudo enviar el pedido',
          err.error?.message || 'No se pudo enviar el pedido. Intenta de nuevo.',
        );
      },
    });
  }
}
