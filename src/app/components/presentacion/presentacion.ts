import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-presentacion',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, NgIconComponent],
  templateUrl: './presentacion.component.html',
})
export class PresentacionComponent implements OnInit {
  estadoCargado = false;
  sinUsuarios = false;
  tituloMarca = 'Mikunaigen';

  constructor(
    private readonly auth: AuthService,
    private readonly configService: ConfigService,
  ) {}

  ngOnInit(): void {
    this.configService
      .obtenerConfiguracion()
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        const nombre = cfg?.nombreNegocio?.trim();
        if (nombre) {
          this.tituloMarca = nombre;
        }
      });

    this.auth
      .obtenerEstadoUsuarios()
      .pipe(catchError(() => of({ hayUsuarios: true, sinUsuarios: false })))
      .subscribe((res) => {
        this.sinUsuarios = res.sinUsuarios === true || !res.hayUsuarios;
        this.estadoCargado = true;
      });
  }
}
