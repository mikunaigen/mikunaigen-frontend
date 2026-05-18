import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of, Subscription, timer } from 'rxjs';
import { IpStatusService } from '../../services/ip-status.service';

@Component({
  selector: 'app-retenido',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './retenido.component.html',
})
export class RetenidoComponent implements OnInit, OnDestroy {
  ipAddress = '-';
  remainingSeconds = 0;
  cargando = true;
  private tickSub?: Subscription;

  constructor(
    private ipStatus: IpStatusService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.ipStatus
      .obtenerEstado()
      .pipe(catchError(() => of({ blocked: false, ipAddress: '-', remainingSeconds: 0 })))
      .subscribe((res) => {
        this.cargando = false;
        this.ipAddress = res.ipAddress || '-';
        this.remainingSeconds = Math.max(0, Number(res.remainingSeconds) || 0);

        if (!res.blocked) {
          void this.router.navigate(['/presentacion']);
          return;
        }

        this.tickSub = timer(0, 1000).subscribe(() => {
          if (this.remainingSeconds > 0) this.remainingSeconds--;
          if (this.remainingSeconds <= 0) {
            this.tickSub?.unsubscribe();
            this.verificarDesbloqueoYRedirigir();
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
  }

  tiempoRestante(): string {
    const h = Math.floor(this.remainingSeconds / 3600);
    const m = Math.floor((this.remainingSeconds % 3600) / 60);
    const s = this.remainingSeconds % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private verificarDesbloqueoYRedirigir() {
    this.ipStatus
      .obtenerEstado()
      .pipe(catchError(() => of({ blocked: false, ipAddress: '-', remainingSeconds: 0 })))
      .subscribe((res) => {
        if (!res.blocked) {
          void this.router.navigate(['/presentacion']);
          return;
        }
        this.ipAddress = res.ipAddress || this.ipAddress;
        this.remainingSeconds = Math.max(1, Number(res.remainingSeconds) || 1);
        this.tickSub = timer(1000, 1000).subscribe(() => {
          if (this.remainingSeconds > 0) this.remainingSeconds--;
          if (this.remainingSeconds <= 0) {
            this.tickSub?.unsubscribe();
            this.verificarDesbloqueoYRedirigir();
          }
        });
      });
  }
}

