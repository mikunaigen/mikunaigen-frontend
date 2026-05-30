import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment';
import { AuthService } from '../../services/auth.service';

const API = environment.apiUrl + '/admin/backups';

interface RespaldoItem {
  resumenId: string;
  postgresKey: string;
  sizeBytes: number;
  lastModified: string | null;
}

interface BackupItemApi {
  key: string;
  sizeBytes: number;
  lastModified: string | null;
}

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface BackupAutomationDto {
  enabled: boolean;
  frequency: Freq;
  timeHHmm: string;
  notifyEmailAfterFinish: boolean;
  nextBackupSummary: string;
  lastAttemptStatus: string;
  lastAttemptAt: string | null;
  lastWorkflowStatus: string | null;
  lastWorkflowAt: string | null;
  lastWorkflowDetail: string | null;
}

@Component({
  selector: 'app-admin-respaldos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './admin-respaldos.component.html',
})
export class AdminRespaldosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);

  cargando = false;
  guardandoAuto = false;
  items: RespaldoItem[] = [];
  private accionPendiente: null | (() => Promise<void>) = null;

  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '' };
  modalMantenimiento = { visible: false, notify: true, item: null as RespaldoItem | null };
  restaurandoAhora = false;

  autoEnabled = false;
  autoFrequency: Freq = 'DAILY';
  autoTime = '03:00';
  autoNotifyEmail = false;
  automationView: BackupAutomationDto | null = null;

  ngOnInit(): void {
    void Promise.all([this.cargarAutomation(), this.refrescarTodo()]);
  }

  private async cargarAutomation(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<BackupAutomationDto>(`${API}/automation`).subscribe({
        next: (row) => {
          this.automationView = row;
          this.autoEnabled = !!row.enabled;
          this.autoFrequency = row.frequency || 'DAILY';
          this.autoTime = row.timeHHmm || '03:00';
          this.autoNotifyEmail = !!row.notifyEmailAfterFinish;
          this.cdr.markForCheck();
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  async guardarAutomatizacion(): Promise<void> {
    this.guardandoAuto = true;
    this.cdr.detectChanges();
    try {
      await new Promise<void>((resolve, reject) => {
        this.http
          .put<BackupAutomationDto>(`${API}/automation`, {
            enabled: this.autoEnabled,
            frequency: this.autoFrequency,
            timeHHmm: this.autoTime,
            notifyEmailAfterFinish: this.autoNotifyEmail,
          })
          .subscribe({
            next: (row) => {
              this.automationView = row;
              this.autoEnabled = !!row.enabled;
              this.autoFrequency = row.frequency || 'DAILY';
              this.autoTime = row.timeHHmm || '03:00';
              this.autoNotifyEmail = !!row.notifyEmailAfterFinish;
              resolve();
            },
            error: () => reject(),
          });
      });
      this.abrirModal('ok', 'Configuración guardada', 'La política de respaldo automático se actualizó.');
    } catch {
      this.abrirModal('error', 'Error', 'No se pudo guardar la configuración automática.');
    } finally {
      this.guardandoAuto = false;
      this.cdr.detectChanges();
    }
  }

  textoEstadoUltimo(): string {
    const w = this.automationView?.lastWorkflowStatus;
    const a = this.automationView?.lastAttemptStatus;
    const raw = (w && w !== 'NONE' ? w : a) || 'NONE';
    const u = String(raw).toUpperCase();
    if (u === 'SUCCESS') return 'Exitoso';
    if (u === 'FAILURE') return 'Fallido';
    if (u === 'PENDING') return 'En proceso';
    if (u === 'CANCELLED' || u === 'CANCELED') return 'Cancelado';
    return 'Sin datos';
  }

  iconoEstadoUltimo(): string {
    const t = this.textoEstadoUltimo();
    if (t === 'Exitoso') return 'heroCheckCircle';
    if (t === 'Fallido' || t === 'Cancelado') return 'heroXCircle';
    if (t === 'En proceso') return 'heroInformationCircle';
    return 'heroExclamationTriangle';
  }

  cuandoUltimoIntento(): string {
    const iso = this.automationView?.lastWorkflowAt || this.automationView?.lastAttemptAt;
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  async refrescarTodo(): Promise<void> {
    this.setCargando(true);
    try {
      await Promise.all([this.recargarLista(), this.cargarAutomation()]);
    } catch {
      this.abrirModal('error', 'Error', 'No se pudo cargar la lista de respaldos.');
    } finally {
      this.setCargando(false);
    }
  }

  async generar(): Promise<void> {
    this.setCargando(true);
    try {
      const clave = await this.generarRespaldo();
      const inicio = Date.now();
      const timeoutMs = 80000;
      const intervaloMs = 5000;
      let encontrado = false;

      while (Date.now() - inicio < timeoutMs) {
        await this.esperar(intervaloMs);
        const lista = await this.listarPostgresql();
        if (lista.some((x) => x.key === clave)) {
          encontrado = true;
          break;
        }
      }

      if (encontrado) {
        await this.recargarLista();
        await this.cargarAutomation();
        this.abrirModal(
          'ok',
          'Respaldo exitoso',
          'El archivo cifrado de PostgreSQL se verificó correctamente en Backblaze B2.',
        );
      } else {
        this.abrirModal(
          'error',
          'Tiempo excedido',
          'El proceso de GitHub Actions está tardando más de lo esperado. Actualiza la lista manualmente en unos momentos.',
        );
      }
    } catch {
      this.abrirModal(
        'error',
        'Error de comunicación',
        'No se pudo conectar con el servidor para iniciar el respaldo.',
      );
    } finally {
      this.setCargando(false);
    }
  }

  restaurar(item: RespaldoItem): void {
    this.modalMantenimiento = { visible: true, notify: true, item };
    this.cdr.detectChanges();
  }

  cerrarMantenimiento(): void {
    this.modalMantenimiento = { visible: false, notify: true, item: null };
    this.cdr.detectChanges();
  }

  async confirmarMantenimiento(): Promise<void> {
    if (!this.modalMantenimiento.item || this.cargando) return;
    const item = this.modalMantenimiento.item;
    const notificar = this.modalMantenimiento.notify;
    this.modalMantenimiento.visible = false;
    this.restaurandoAhora = true;
    this.cdr.detectChanges();
    try {
      const s = this.auth.getSession();
      await new Promise<void>((resolve, reject) => {
        this.http
          .post<{ ok: boolean }>(`${API}/restore-pair`, {
            postgresKey: item.postgresKey,
            notifyWhenDone: notificar,
            notifyEmail: typeof s?.email === 'string' ? s.email : undefined,
          })
          .subscribe({
            next: () => resolve(),
            error: () => reject(),
          });
      });
    } catch (e) {
      this.restaurandoAhora = false;
      this.abrirModal('error', 'Error', this.mensajeError(e) || 'No se pudo iniciar el mantenimiento.');
    } finally {
      this.cdr.detectChanges();
    }
  }

  eliminar(item: RespaldoItem): void {
    this.abrirConfirmacion('Eliminar backup', '¿Deseas eliminar este respaldo de PostgreSQL?', async () => {
      await this.eliminarConfirmado(item);
    });
  }

  private async eliminarConfirmado(item: RespaldoItem): Promise<void> {
    this.setCargando(true);
    try {
      await this.eliminarClave(item.postgresKey);
      await this.refrescarTodo();
      this.abrirModal('ok', 'Eliminado', 'El respaldo fue eliminado.');
    } catch (e) {
      this.abrirModal('error', 'Error', this.mensajeError(e) || 'No se pudo eliminar el respaldo.');
    } finally {
      this.setCargando(false);
    }
  }

  cerrarModal(): void {
    this.modal.visible = false;
    this.accionPendiente = null;
    this.cdr.detectChanges();
  }

  cancelarConfirmacion(): void {
    this.modal.visible = false;
    this.accionPendiente = null;
    this.cdr.detectChanges();
  }

  async confirmarModal(): Promise<void> {
    if (!this.accionPendiente || this.cargando) return;
    const action = this.accionPendiente;
    this.accionPendiente = null;
    this.modal.visible = false;
    this.cdr.detectChanges();
    await action();
  }

  formatBytes(n: number): string {
    const v = Number(n || 0);
    if (v < 1024) return `${v} B`;
    const kb = v / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  private abrirModal(tipo: 'ok' | 'error' | 'info', titulo: string, mensaje: string): void {
    this.modal = { visible: true, tipo, titulo, mensaje };
    this.accionPendiente = null;
    this.cdr.detectChanges();
  }

  private abrirConfirmacion(titulo: string, mensaje: string, action: () => Promise<void>): void {
    this.accionPendiente = action;
    this.modal = { visible: true, tipo: 'confirm', titulo, mensaje };
    this.cdr.detectChanges();
  }

  private mensajeError(e: unknown): string {
    const err = e as { error?: { message?: string; error?: string }; message?: string };
    return err?.error?.message || err?.error?.error || err?.message || '';
  }

  private async recargarLista(): Promise<void> {
    const filas = await this.listarPostgresql();
    this.items = filas.map((f) => this.mapearItem(f));
    this.items.sort((a, b) => this.ordenarFechaDesc(a.lastModified, b.lastModified));
  }

  private mapearItem(fila: BackupItemApi): RespaldoItem {
    return {
      resumenId: this.extraerResumenId(fila.key) ?? fila.key,
      postgresKey: fila.key,
      sizeBytes: Number(fila.sizeBytes || 0),
      lastModified: fila.lastModified,
    };
  }

  private listarPostgresql(): Promise<BackupItemApi[]> {
    const params = new HttpParams().set('db', 'postgresql');
    return new Promise((resolve, reject) => {
      this.http.get<BackupItemApi[]>(`${API}/list`, { params }).subscribe({
        next: (rows) => resolve(rows ?? []),
        error: () => reject(),
      });
    });
  }

  private generarRespaldo(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .post<{ ok: boolean; postgresKey?: string }>(`${API}/generate-pair`, null)
        .subscribe({
          next: (res) => {
            if (res?.postgresKey) {
              resolve(res.postgresKey);
            } else {
              reject(new Error('Sin clave de respaldo'));
            }
          },
          error: (e) => reject(e),
        });
    });
  }

  private eliminarClave(key: string): Promise<void> {
    const params = new HttpParams().set('key', key);
    return new Promise((resolve, reject) => {
      this.http.delete<{ ok: boolean }>(`${API}/delete`, { params }).subscribe({
        next: () => resolve(),
        error: (e) => reject(e),
      });
    });
  }

  private extraerResumenId(key: string): string | null {
    const m = key?.match(/^backup_postgresql_(\d{8}_\d{4})/i);
    return m?.[1] ?? null;
  }

  private ordenarFechaDesc(a: string | null, b: string | null): number {
    const ta = a ? new Date(a).getTime() : 0;
    const tb = b ? new Date(b).getTime() : 0;
    return tb - ta;
  }

  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private setCargando(on: boolean): void {
    this.cargando = on;
    this.cdr.detectChanges();
  }
}
