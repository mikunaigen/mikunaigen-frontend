import { Routes } from '@angular/router';
import { SetupInicialComponent } from './components/setup-inicial/setup-inicial';
import { LoginComponent } from './components/login/login';
import { RecuperarPasswordComponent } from './components/recuperar-password/recuperar-password';
import { RegistroComponent } from './components/registro/registro';
import { GestionAdministradorComponent } from './components/gestion-administrador/gestion-administrador';
import { ConfirmarCuentaComponent } from './components/confirmar-cuenta/confirmar-cuenta';
import { UsuarioHomeComponent } from './components/usuario-home/usuario-home';
import { AdminSolicitudesPlanComponent } from './components/admin-solicitudes-plan/admin-solicitudes-plan';
import { AdminDatasetAlimentosComponent } from './components/admin-dataset-alimentos/admin-dataset-alimentos';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { AdminRespaldosComponent } from './components/admin-respaldos/admin-respaldos';
import { AdminModelosIaComponent } from './components/admin-modelos-ia/admin-modelos-ia';
import { AdminAuditoriaSeguridadComponent } from './components/admin-auditoria-seguridad/admin-auditoria-seguridad';
import { InicioRedirectComponent } from './components/inicio-redirect/inicio-redirect';
import { PresentacionComponent } from './components/presentacion/presentacion';
import { RetenidoComponent } from './components/retenido/retenido';
import { MiPerfilComponent } from './components/mi-perfil/mi-perfil';
import { ObjetivoNutricionalComponent } from './components/objetivo-nutricional/objetivo-nutricional';
import { ParametrizacionFormulacionComponent } from './components/parametrizacion-formulacion/parametrizacion-formulacion';
import { FormularRecetaComponent } from './components/formular-receta/formular-receta';
import { MisRecetasComponent } from './components/mis-recetas/mis-recetas';
import { MantenimientoComponent } from './components/mantenimiento/mantenimiento';
import { MenuClienteComponent } from './components/menu-cliente/menu-cliente';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { adminGuard } from './guards/admin.guard';
import { configRequiredGuard } from './guards/config-required.guard';
import { setupFlowGuard } from './guards/setup-flow.guard';
import { ipBlockGuard } from './guards/ip-block.guard';
import { clienteGuard } from './guards/cliente.guard';
import { loginAccesoGuard } from './guards/login-acceso.guard';

export const routes: Routes = [
  { path: 'mantenimiento', component: MantenimientoComponent },
  { path: 'retenido', component: RetenidoComponent },
  { path: 'presentacion', component: PresentacionComponent, canActivate: [ipBlockGuard, configRequiredGuard] },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, guestGuard, loginAccesoGuard],
  },
  { path: 'registro', component: RegistroComponent, canActivate: [ipBlockGuard, configRequiredGuard, guestGuard] },
  { path: 'recuperar', component: RecuperarPasswordComponent, canActivate: [ipBlockGuard, configRequiredGuard] },
  { path: 'mi-perfil', component: MiPerfilComponent, canActivate: [ipBlockGuard, configRequiredGuard, authGuard] },
  {
    path: 'setup',
    component: SetupInicialComponent,
    canActivate: [ipBlockGuard, setupFlowGuard],
  },
  {
    path: 'gestion-administrador',
    component: GestionAdministradorComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  { path: 'confirmar-cuenta', component: ConfirmarCuentaComponent, canActivate: [ipBlockGuard, configRequiredGuard, authGuard] },
  {
    path: 'usuario-home',
    component: UsuarioHomeComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard],
  },
  {
    path: 'objetivo-nutricional',
    component: ObjetivoNutricionalComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, clienteGuard],
  },
  {
    path: 'parametrizacion',
    component: ParametrizacionFormulacionComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, clienteGuard],
  },
  {
    path: 'formular',
    component: FormularRecetaComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, clienteGuard],
  },
  {
    path: 'mis-recetas',
    component: MisRecetasComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, clienteGuard],
  },
  {
    path: 'menu',
    component: MenuClienteComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, clienteGuard],
  },
  {
    path: 'admin-solicitudes-plan',
    component: AdminSolicitudesPlanComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  {
    path: 'admin-respaldos',
    component: AdminRespaldosComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  {
    path: 'admin-dataset-alimentos',
    component: AdminDatasetAlimentosComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  {
    path: 'admin-modelos-ia',
    component: AdminModelosIaComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  {
    path: 'admin-auditoria-seguridad',
    component: AdminAuditoriaSeguridadComponent,
    canActivate: [ipBlockGuard, configRequiredGuard, authGuard, adminGuard],
  },
  { path: '', component: InicioRedirectComponent, canActivate: [ipBlockGuard], pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
