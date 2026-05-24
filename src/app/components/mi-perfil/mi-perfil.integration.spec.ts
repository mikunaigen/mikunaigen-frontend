import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MiPerfilComponent } from './mi-perfil';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { environment } from '@env/environment';

function tokenValido(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

describe('MiPerfilComponent integración', () => {
  let fixture: ComponentFixture<MiPerfilComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MiPerfilComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: MiPerfilComponent }]),
        AuthService,
        {
          provide: WebsocketService,
          useValue: { subscribeToTopic: () => of('') },
        },
      ],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    auth.setSession({ token: tokenValido(), email: 'ana@gmail.com', role: 'estudiante', userId: 'u1' });

    fixture = TestBed.createComponent(MiPerfilComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/perfil/me`).flush({
      nombres: 'Ana',
      apellidos: 'Perez',
      email: 'ana@gmail.com',
      role: 'estudiante',
    });
    httpMock.expectOne(`${environment.apiUrl}/preferencias/me`).flush({
      rol: 'estudiante',
      requiereConfiguracion: false,
      capacidades: {
        puedeMinimoCosto: false,
        puedeMaximaBiodiversidad: false,
        puedePresupuesto: false,
        puedeExcluirIngredientes: true,
        puedeEstacionalidad: false,
        maxExclusiones: 5,
        mensajePresupuestoBloqueado: 'Disponible en Plan Emprendedor y Nutricionista',
      },
      preferencias: {
        enfoquePrincipal: 'maxima_precision_nutricional',
        presupuestoMaximo: null,
        filtroEstacionalidadActivo: false,
        preferenciasCompletadas: false,
        ingredientesExcluidos: [],
      },
    });
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('HU-05: edición válida envía PUT y muestra confirmación', async () => {
    const comp = fixture.componentInstance;
    comp.form.nombres = 'Ana María';
    comp.form.apellidos = 'Perez';

    comp.guardarCambios();

    const req = httpMock.expectOne(`${environment.apiUrl}/perfil/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombres: 'Ana María', apellidos: 'Perez' });
    req.flush({ message: 'Datos Actualizados Correctamente' });

    await fixture.whenStable();
    expect(comp.modal()?.mensaje).toBe('Datos Actualizados Correctamente');
  });

  it('HU-05: nombres con números muestran error sin llamar al backend', () => {
    const comp = fixture.componentInstance;
    comp.form.nombres = 'Ana123';

    comp.guardarCambios();

    httpMock.expectNone(`${environment.apiUrl}/perfil/me`);
    expect(comp.modal()?.tipo).toBe('error');
  });
});
