import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-presentacion',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './presentacion.component.html',
})
export class PresentacionComponent {}

