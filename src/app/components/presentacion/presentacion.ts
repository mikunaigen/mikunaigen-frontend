import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-presentacion',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './presentacion.component.html',
})
export class PresentacionComponent implements OnInit {
  estadoCargado = false;
  sinUsuarios = false;

  constructor(private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.auth
      .obtenerEstadoUsuarios()
      .pipe(catchError(() => of({ hayUsuarios: true, sinUsuarios: false })))
      .subscribe((res) => {
        this.sinUsuarios = res.sinUsuarios === true || !res.hayUsuarios;
        this.estadoCargado = true;
      });
  }
}
