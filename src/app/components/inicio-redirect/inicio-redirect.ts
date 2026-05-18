import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-inicio-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rb-page-center">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-secondary border-t-transparent"></div>
    </div>
  `,
})
export class InicioRedirectComponent implements OnInit {
  constructor(
    private config: ConfigService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.config
      .obtenerEstado()
      .pipe(catchError(() => of({ configuracionCompleta: false })))
      .subscribe((res) => {
        void this.router.navigate([res.configuracionCompleta ? '/presentacion' : '/setup']);
      });
  }
}

