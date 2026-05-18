import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { WebsocketService } from '../../services/websocket.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '@env/environment';
import { ChartTester } from '../../utils/chart-tester';

const API = environment.apiUrl + '/admin/dashboard';

export interface DashFiltroOpcion {
  value: string;
  label: string;
  img: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);
  private readonly websocketService = inject(WebsocketService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private themeSub?: Subscription;
  private wsReportSub?: Subscription;
  private pollReportTimer: ReturnType<typeof setInterval> | null = null;
  private reportJobId: string | null = null;

  exportandoReporte = false;
  modalExportOpciones = {
    visible: false,
    format: 'PDF' as 'PDF' | 'EXCEL',
    includeKpis: true,
    includeCharts: true,
    includeTables: true,
  };
  modalReporte = {
    visible: false,
    fase: 'pendiente' as 'pendiente' | 'listo' | 'error',
    tabLabel: '',
    fileName: '',
    downloadUrl: '',
    mensaje: '',
  };

  readonly tabs: { id: string; label: string; icon: string }[] = [
    { id: 'ventas', label: 'Ventas y Pedidos', icon: '/iconos/billetes-soles.png' },
    { id: 'inventario', label: 'Inventario y Costos', icon: '/iconos/categoria-verduras.png' },
    { id: 'inventario_prediccion', label: 'Predicción de Inventario', icon: '/iconos/consulta-informacion-azul.png' },
    { id: 'productos', label: 'Productos', icon: '/iconos/categoria-plato-principal.png' },
    { id: 'clientes', label: 'Clientes', icon: '/iconos/categoria-entrada.png' },
    { id: 'operacion', label: 'Operación', icon: '/iconos/camion-abastecer-ingrediente.png' },
    { id: 'seguridad', label: 'Seguridad', icon: '/iconos/candado.png' },
    { id: 'interacciones', label: 'Interacciones', icon: '/iconos/destellos-recomendaciones.png' },
  ];

  pestana = 'ventas';
  cargando = false;
  errorMsg = '';

  fromDate = '';
  toDate = '';
  fechaMinimaTab = '';
  fechaMaximaTab = '';
  cargandoRangoFechas = false;

  filtroEstado = '';
  filtroMomento = '';
  filtroDiaSemana = '';
  filtroClima = '';

  filtroCatInsumo = '';
  filtroMovTipo = '';
  soloStockBajo = false;
  umbralStock = 10;

  filtroCatProducto = '';
  filtroEstrellasMin: number | null = null;
  filtroRangoPrecio = '';

  regDesde = '';
  regHasta = '';
  soloRecurrentes = false;

  filtroLoginStatus = '';
  filtroRolLogin = '';

  filtroAccionIx = '';
  filtroClimaIx = '';
  filtroSegmentoIx = '';

  readonly filtroEstadosPedido: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'PENDIENTE_PAGO', label: 'Pendiente pago', img: '/iconos/documento.png' },
    { value: 'VALIDANDO_PAGO', label: 'Validando pago', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'PAGO_VALIDADO', label: 'Pago validado', img: '/iconos/billetes-soles.png' },
    { value: 'EN_COCINA', label: 'En cocina', img: '/iconos/plato.png' },
    { value: 'PREPARADO', label: 'Preparado', img: '/iconos/destellos-recomendaciones.png' },
    { value: 'EN_CAMINO', label: 'En camino', img: '/iconos/camion-abastecer-ingrediente.png' },
    { value: 'ENTREGADO', label: 'Entregado', img: '/iconos/like-pulgar.png' },
    { value: 'CANCELADO', label: 'Cancelado', img: '/iconos/error-rojo.png' },
  ];

  readonly filtroMomentosDia: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'MADRUGADA', label: 'Madrugada', img: '/iconos/candado.png' },
    { value: 'MAÑANA', label: 'Mañana', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'TARDE', label: 'Tarde', img: '/iconos/advertencia-amarillo.png' },
    { value: 'NOCHE', label: 'Noche', img: '/iconos/engranajes.png' },
  ];

  readonly filtroDiasSemanaOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'LUNES', label: 'Lunes', img: '/iconos/categoria-entrada.png' },
    { value: 'MARTES', label: 'Martes', img: '/iconos/categoria-plato-principal.png' },
    { value: 'MIERCOLES', label: 'Miércoles', img: '/iconos/categoria-verduras.png' },
    { value: 'JUEVES', label: 'Jueves', img: '/iconos/categoria-carnes.png' },
    { value: 'VIERNES', label: 'Viernes', img: '/iconos/categoria-bebidas.png' },
    { value: 'SABADO', label: 'Sábado', img: '/iconos/categoria-postres.png' },
    { value: 'DOMINGO', label: 'Domingo', img: '/iconos/categoria-frutas.png' },
  ];

  readonly filtroClimaOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'SOLEADO', label: 'Soleado', img: '/iconos/advertencia-amarillo.png' },
    { value: 'PARCIALMENTE_NUBLADO', label: 'Parcial nublado', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'NUBLADO', label: 'Nublado', img: '/iconos/engranajes.png' },
    { value: 'LLUVIOSO', label: 'Lluvioso', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'TORMENTA', label: 'Tormenta', img: '/iconos/error-rojo.png' },
    { value: 'OTRO', label: 'Otro', img: '/iconos/lupa.png' },
  ];

  readonly categoriasInsumoDash: DashFiltroOpcion[] = [
    { value: '', label: 'Todas', img: '/iconos/lupa.png' },
    { value: 'Verduras', label: 'Verduras', img: '/iconos/categoria-verduras.png' },
    { value: 'Carnes', label: 'Carnes', img: '/iconos/categoria-carnes.png' },
    { value: 'Huevos', label: 'Huevos', img: '/iconos/categoria-huevos.png' },
    { value: 'Marinos', label: 'Marinos', img: '/iconos/categoria-marinos.png' },
    { value: 'Abarrotes', label: 'Abarrotes', img: '/iconos/categoria-abarrotes.png' },
    { value: 'Lácteos', label: 'Lácteos', img: '/iconos/categoria-lacteos.png' },
    { value: 'Bebidas', label: 'Bebidas', img: '/iconos/categoria-bebidas.png' },
    { value: 'Frutas', label: 'Frutas', img: '/iconos/categoria-frutas.png' },
    { value: 'Panadería', label: 'Panadería', img: '/iconos/categoria-panaderia.png' },
  ];

  readonly filtroTipoMovOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'SALIDA', label: 'Salida', img: '/iconos/tacho.png' },
    { value: 'ABASTECIMIENTO', label: 'Abastecimiento', img: '/iconos/camion-abastecer-ingrediente.png' },
  ];

  readonly umbralStockOpc: DashFiltroOpcion[] = [
    { value: '5', label: '≤ 5', img: '/iconos/advertencia-amarillo.png' },
    { value: '10', label: '≤ 10', img: '/iconos/advertencia-amarillo.png' },
    { value: '20', label: '≤ 20', img: '/iconos/consulta-informacion-azul.png' },
    { value: '50', label: '≤ 50', img: '/iconos/consulta-informacion-azul.png' },
  ];

  readonly filtroStockBajoOpc: DashFiltroOpcion[] = [
    { value: 'all', label: 'Todo el inventario', img: '/iconos/categoria-verduras.png' },
    { value: 'bajo', label: 'Solo stock bajo', img: '/iconos/advertencia-amarillo.png' },
  ];

  readonly categoriasProductoDash: DashFiltroOpcion[] = [
    { value: '', label: 'Todas', img: '/iconos/lupa.png' },
    { value: 'Entrada', label: 'Entrada', img: '/iconos/categoria-entrada.png' },
    { value: 'Plato Principal', label: 'Plato principal', img: '/iconos/categoria-plato-principal.png' },
    { value: 'Postres', label: 'Postres', img: '/iconos/categoria-postres.png' },
    { value: 'Bebidas', label: 'Bebidas', img: '/iconos/categoria-bebidas.png' },
  ];

  readonly filtroEstrellasOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todas', img: '/iconos/lupa.png' },
    { value: '5', label: '5★', img: '/iconos/like-pulgar.png' },
    { value: '4', label: '4★+', img: '/iconos/like-pulgar.png' },
    { value: '3', label: '3★+', img: '/iconos/advertencia-amarillo.png' },
    { value: '2', label: '2★+', img: '/iconos/advertencia-amarillo.png' },
    { value: '1', label: '1★+', img: '/iconos/error-rojo.png' },
  ];

  readonly filtroRangoPrecioOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'LT25', label: 'Hasta S/ 25', img: '/iconos/billetes-soles.png' },
    { value: '25_50', label: 'S/ 25 – 50', img: '/iconos/billetes-soles.png' },
    { value: 'GT50', label: 'Más de S/ 50', img: '/iconos/billetes-soles.png' },
  ];

  readonly filtroRecurrentesOpc: DashFiltroOpcion[] = [
    { value: 'all', label: 'Todos los clientes', img: '/iconos/usuarios.png' },
    { value: 'rec', label: 'Solo recurrentes', img: '/iconos/destellos-recomendaciones.png' },
  ];

  readonly filtroLoginStatusOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'SUCCESS', label: 'Éxito', img: '/iconos/correcto-check-verde.png' },
    { value: 'FAILED', label: 'Fallido', img: '/iconos/error-rojo.png' },
    { value: 'BLOCKED', label: 'Bloqueado', img: '/iconos/candado.png' },
  ];

  readonly filtroRolLoginOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'ADMIN', label: 'Admin', img: '/iconos/engranajes.png' },
    { value: 'CLIENTE', label: 'Cliente', img: '/iconos/categoria-entrada.png' },
    { value: 'CAJERO', label: 'Cajero', img: '/iconos/billetes-soles.png' },
    { value: 'COCINA', label: 'Cocina', img: '/iconos/plato.png' },
    { value: 'REPARTIDOR', label: 'Repartidor', img: '/iconos/camion-abastecer-ingrediente.png' },
  ];

  readonly filtroAccionIxOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todas', img: '/iconos/lupa.png' },
    { value: 'VIEW_DETAIL', label: 'Ver detalle', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'ADD_TO_CART', label: 'Añadir carrito', img: '/iconos/agregar.png' },
    { value: 'INCREMENT_QUANTITY', label: 'Más cantidad', img: '/iconos/agregar.png' },
    { value: 'REMOVE_FROM_CART', label: 'Quitar carrito', img: '/iconos/tacho.png' },
    { value: 'REJECT_RECOMMENDATION', label: 'Rechazar IA', img: '/iconos/error-rojo.png' },
    { value: 'IMAGE_SWIPE', label: 'Swipe imagen', img: '/iconos/destellos-recomendaciones.png' },
    { value: 'CLOSE_DETAIL_WITHOUT_ADD', label: 'Cerrar sin comprar', img: '/iconos/logout.png' },
  ];

  readonly filtroSegmentoIxOpc: DashFiltroOpcion[] = [
    { value: '', label: 'Todos', img: '/iconos/lupa.png' },
    { value: 'MADRUGADA', label: 'Madrugada', img: '/iconos/candado.png' },
    { value: 'MAÑANA', label: 'Mañana', img: '/iconos/consulta-informacion-azul.png' },
    { value: 'TARDE', label: 'Tarde', img: '/iconos/advertencia-amarillo.png' },
    { value: 'NOCHE', label: 'Noche', img: '/iconos/engranajes.png' },
  ];

  ventas: any = null;
  inventario: any = null;
  productos: any = null;
  clientes: any = null;
  operacion: any = null;
  seguridad: any = null;
  interacciones: any = null;

  prediccionInv: Record<string, unknown> | null = null;
  horizonteInv = '1_semana';
  predInvError = '';
  predInvCargando = false;

  private charts = new Map<string, Chart>();
  private sinDatosCharts = new Set<string>();

  diasSemanaLabel = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly msgSinDatos = 'No se encontraron datos';
  readonly horasDia = Array.from({ length: 24 }, (_, i) => i);

  ngOnInit(): void {
    this.themeSub = this.theme.themeChanged.subscribe(() => {
      if (this.charts.size === 0) return;
      queueMicrotask(() => this.refreshChartsForTheme());
    });
    this.wsReportSub = this.websocketService
      .subscribeToTopic('/topic/admin/dashboard-report')
      .subscribe((raw) => this.onReporteWs(raw));
    void this.iniciarDashboard();
  }

  ngOnDestroy(): void {
    this.detenerPollingReporte();
    this.wsReportSub?.unsubscribe();
    this.themeSub?.unsubscribe();
    this.destroyAllCharts();
  }

  constructor() {
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);
    this.toDate = this.toYmd(hoy);
    this.fromDate = this.toYmd(hace30);
  }

  async cambiarPestana(id: string): Promise<void> {
    this.pestana = id;
    this.errorMsg = '';
    this.predInvError = '';
    if (id !== 'inventario_prediccion') {
      await this.cargarRangoFechasPestana();
    }
    await this.cargarActual();
  }

  aplicarFiltros(): void {
    this.ajustarRangoFechas();
    void this.cargarActual();
  }

  get fechaHoyInput(): string {
    return this.fechaMaximaTab || this.toYmd(new Date());
  }

  get fechaMinimaDesdeInput(): string {
    return this.fechaMinimaTab || this.fechaHoyInput;
  }

  get desdeElInicioActivo(): boolean {
    return !!this.fechaMinimaTab && this.fromDate === this.fechaMinimaTab;
  }

  desdeElInicio(): void {
    if (!this.fechaMinimaTab) return;
    this.fromDate = this.fechaMinimaTab;
    this.ajustarRangoFechas();
    void this.aplicarFiltros();
  }

  onCambioFechaDesde(): void {
    this.ajustarRangoFechas();
  }

  onCambioFechaHasta(): void {
    this.ajustarRangoFechas();
  }

  private async iniciarDashboard(): Promise<void> {
    if (this.pestana !== 'inventario_prediccion') {
      await this.cargarRangoFechasPestana();
    }
    await this.cargarActual();
  }

  private ajustarRangoFechas(): void {
    const min = this.fechaMinimaDesdeInput;
    const max = this.fechaHoyInput;
    if (!this.fromDate || this.fromDate < min) {
      this.fromDate = min;
    }
    if (this.fromDate > max) {
      this.fromDate = max;
    }
    if (!this.toDate || this.toDate > max) {
      this.toDate = max;
    }
    if (this.toDate < min) {
      this.toDate = min;
    }
    if (this.fromDate > this.toDate) {
      this.toDate = this.fromDate;
    }
  }

  private cargarRangoFechasPestana(): Promise<void> {
    return new Promise((resolve) => {
      this.cargandoRangoFechas = true;
      this.http
        .get<{ fechaMinima: string; fechaMaxima: string }>(`${API}/rango-fechas`, {
          params: new HttpParams().set('pestana', this.pestana),
        })
        .subscribe({
          next: (r) => {
            this.fechaMinimaTab = r.fechaMinima || this.toYmd(new Date());
            this.fechaMaximaTab = r.fechaMaxima || this.toYmd(new Date());
            this.ajustarRangoFechas();
            this.cargandoRangoFechas = false;
            this.cdr.detectChanges();
            resolve();
          },
          error: () => {
            const hoy = this.toYmd(new Date());
            this.fechaMinimaTab = hoy;
            this.fechaMaximaTab = hoy;
            this.ajustarRangoFechas();
            this.cargandoRangoFechas = false;
            this.cdr.detectChanges();
            resolve();
          },
        });
    });
  }

  filtroChipClass(active: boolean): string {
    return active
      ? 'border-secondary bg-secondary text-white dark:ring-2 dark:ring-blue-400/35'
      : 'border-gray-200 bg-white text-neutral-strong hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-muted dark:hover:bg-slate-800';
  }

  seleccionarFiltroEstado(v: string): void {
    this.filtroEstado = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroMomento(v: string): void {
    this.filtroMomento = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroDiaSemana(v: string): void {
    this.filtroDiaSemana = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroClima(v: string): void {
    this.filtroClima = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroCatInsumo(v: string): void {
    this.filtroCatInsumo = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroMovTipo(v: string): void {
    this.filtroMovTipo = v;
    void this.aplicarFiltros();
  }

  seleccionarUmbralStock(v: string): void {
    this.umbralStock = parseInt(v, 10) || 10;
    void this.aplicarFiltros();
  }

  seleccionarStockBajo(modo: string): void {
    this.soloStockBajo = modo === 'bajo';
    void this.aplicarFiltros();
  }

  seleccionarFiltroCatProducto(v: string): void {
    this.filtroCatProducto = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroEstrellas(v: string): void {
    this.filtroEstrellasMin = v === '' ? null : parseInt(v, 10);
    void this.aplicarFiltros();
  }

  seleccionarFiltroRangoPrecio(v: string): void {
    this.filtroRangoPrecio = v;
    void this.aplicarFiltros();
  }

  seleccionarRecurrentes(modo: string): void {
    this.soloRecurrentes = modo === 'rec';
    void this.aplicarFiltros();
  }

  seleccionarFiltroLoginStatus(v: string): void {
    this.filtroLoginStatus = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroRolLogin(v: string): void {
    this.filtroRolLogin = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroAccionIx(v: string): void {
    this.filtroAccionIx = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroClimaIx(v: string): void {
    this.filtroClimaIx = v;
    void this.aplicarFiltros();
  }

  seleccionarFiltroSegmentoIx(v: string): void {
    this.filtroSegmentoIx = v;
    void this.aplicarFiltros();
  }

  estrellasFiltroActivo(v: string): boolean {
    if (v === '') return this.filtroEstrellasMin == null;
    return this.filtroEstrellasMin === parseInt(v, 10);
  }

  umbralStockActivo(v: string): boolean {
    return String(this.umbralStock) === v;
  }

  recurrentesActivo(modo: string): boolean {
    return modo === 'rec' ? this.soloRecurrentes : !this.soloRecurrentes;
  }

  stockBajoActivo(modo: string): boolean {
    return modo === 'bajo' ? this.soloStockBajo : !this.soloStockBajo;
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private exclusiveToIso(endYmd: string): string {
    const [y, m, d] = endYmd.split('-').map((x) => parseInt(x, 10));
    const next = new Date(y, m - 1, d + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}T00:00:00`;
  }

  private baseParams(): HttpParams {
    let p = new HttpParams()
      .set('from', `${this.fromDate}T00:00:00`)
      .set('to', this.exclusiveToIso(this.toDate));
    return p;
  }

  async cargarActual(): Promise<void> {
    this.cargando = true;
    this.errorMsg = '';
    this.destroyAllCharts();

    try {
      if (this.pestana === 'ventas') await this.cargarVentas();
      else if (this.pestana === 'inventario') await this.cargarInventario();
      else if (this.pestana === 'productos') await this.cargarProductos();
      else if (this.pestana === 'clientes') await this.cargarClientes();
      else if (this.pestana === 'operacion') await this.cargarOperacion();
      else if (this.pestana === 'seguridad') await this.cargarSeguridad();
      else if (this.pestana === 'interacciones') await this.cargarInteracciones();
      else if (this.pestana === 'inventario_prediccion') {
        await Promise.resolve();
      }
    } catch {
      this.errorMsg = 'No se pudo cargar el panel.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }

    if (!this.errorMsg) {
      setTimeout(() => {
        this.renderizarGraficosSegunPestana();
        this.cdr.detectChanges();
      }, 0);
    }
  }

  private renderizarGraficosSegunPestana() {
    if (this.pestana === 'ventas') this.renderVentasCharts();
    else if (this.pestana === 'inventario') this.renderInventarioCharts();
    else if (this.pestana === 'productos') this.renderProductosCharts();
    else if (this.pestana === 'clientes') this.renderClientesCharts();
    else if (this.pestana === 'operacion') this.renderOperacionCharts();
    else if (this.pestana === 'seguridad') this.renderSeguridadCharts();
    else if (this.pestana === 'interacciones') this.renderInteraccionesCharts();
    else if (this.pestana === 'inventario_prediccion') {
      return;
    }
  }

  private cargarVentas(): Promise<void> {
    let p = this.baseParams();
    if (this.filtroEstado) p = p.set('status', this.filtroEstado);
    if (this.filtroMomento) p = p.set('momentOfDay', this.filtroMomento);
    if (this.filtroDiaSemana) p = p.set('dayOfWeek', this.filtroDiaSemana);
    if (this.filtroClima) p = p.set('weatherCondition', this.filtroClima);
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/ventas-pedidos`, { params: p }).subscribe({
        next: (d) => {
          this.ventas = d;
          ChartTester.logPayload('Ventas y Pedidos', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarInventario(): Promise<void> {
    let p = this.baseParams();
    if (this.filtroCatInsumo) p = p.set('categoriaInsumo', this.filtroCatInsumo);
    if (this.filtroMovTipo) p = p.set('tipoMovimiento', this.filtroMovTipo);
    p = p.set('soloStockBajo', String(this.soloStockBajo));
    p = p.set('umbralStockBajo', String(this.umbralStock));
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/inventario-costos`, { params: p }).subscribe({
        next: (d) => {
          this.inventario = d;
          ChartTester.logPayload('Inventario', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarProductos(): Promise<void> {
    let p = this.baseParams();
    if (this.filtroCatProducto) p = p.set('categoriaProducto', this.filtroCatProducto);
    if (this.filtroEstrellasMin != null) p = p.set('estrellasMin', String(this.filtroEstrellasMin));
    if (this.filtroRangoPrecio === 'LT25') p = p.set('precioMax', '25');
    else if (this.filtroRangoPrecio === '25_50') {
      p = p.set('precioMin', '25');
      p = p.set('precioMax', '50');
    } else if (this.filtroRangoPrecio === 'GT50') p = p.set('precioMin', '50');
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/productos`, { params: p }).subscribe({
        next: (d) => {
          this.productos = d;
          ChartTester.logPayload('Productos', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarClientes(): Promise<void> {
    let p = this.baseParams();
    if (this.regDesde) p = p.set('regFrom', `${this.regDesde}T00:00:00`);
    if (this.regHasta) p = p.set('regTo', this.exclusiveToIso(this.regHasta));
    if (this.soloRecurrentes) p = p.set('soloRecurrentes', 'true');
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/clientes`, { params: p }).subscribe({
        next: (d) => {
          this.clientes = d;
          ChartTester.logPayload('Clientes', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarOperacion(): Promise<void> {
    const p = this.baseParams();
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/operacion`, { params: p }).subscribe({
        next: (d) => {
          this.operacion = d;
          ChartTester.logPayload('Operación', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarSeguridad(): Promise<void> {
    let p = this.baseParams();
    if (this.filtroLoginStatus) p = p.set('status', this.filtroLoginStatus);
    if (this.filtroRolLogin) p = p.set('rol', this.filtroRolLogin);
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/seguridad`, { params: p }).subscribe({
        next: (d) => {
          this.seguridad = d;
          ChartTester.logPayload('Seguridad', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private cargarInteracciones(): Promise<void> {
    let p = this.baseParams();
    if (this.filtroAccionIx) p = p.set('action', this.filtroAccionIx);
    if (this.filtroClimaIx) p = p.set('condicionClima', this.filtroClimaIx);
    if (this.filtroSegmentoIx) p = p.set('segmento', this.filtroSegmentoIx);
    return new Promise((resolve, reject) => {
      this.http.get(`${API}/interacciones`, { params: p }).subscribe({
        next: (d) => {
          this.interacciones = d;
          ChartTester.logPayload('Interacciones', d);
          resolve();
        },
        error: () => reject(),
      });
    });
  }

  private tc() {
    const dark = this.theme.isDark();
    return {
      text: dark ? '#e2e8f0' : '#1f2937',
      grid: dark ? '#334155' : '#e5e7eb',
      subtle: dark ? '#94a3b8' : '#6b7280',
    };
  }

  private patchChartOptions(opts: any): void {
    if (!opts) return;
    const t = this.tc();
    const dark = this.theme.isDark();
    opts.plugins = opts.plugins || {};
    opts.plugins.tooltip = {
      ...(opts.plugins.tooltip || {}),
      backgroundColor: dark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.97)',
      titleColor: t.text,
      bodyColor: t.text,
      borderColor: t.grid,
      borderWidth: 1,
      padding: 10,
    };
    const labels = opts.plugins.legend?.labels;
    if (labels && typeof labels === 'object') {
      (labels as { color?: string }).color = t.text;
    }
    const scales = opts.scales as Record<string, any> | undefined;
    if (scales && typeof scales === 'object') {
      for (const key of Object.keys(scales)) {
        const s = scales[key];
        if (!s || typeof s !== 'object') continue;
        if (s.ticks) s.ticks.color = t.subtle;
        if (s.grid) s.grid.color = t.grid;
        if (s.title && typeof s.title === 'object') s.title.color = t.subtle;
      }
    }
  }

  private prepararChartsSinDatos(ids: string[]): void {
    this.sinDatosCharts = new Set(ids);
  }

  sinDatosChart(id: string): boolean {
    return this.sinDatosCharts.has(id);
  }

  private seriesTieneDatos(values: number[]): boolean {
    return values.length > 0 && values.some((v) => Number(v) > 0);
  }

  private recordTieneDatos(rec?: Record<string, number> | null): boolean {
    if (!rec || !Object.keys(rec).length) return false;
    return Object.values(rec).some((v) => Number(v) > 0);
  }

  private listaTieneDatos<T>(list?: T[] | null): boolean {
    return (list?.length ?? 0) > 0;
  }

  private tabSinActividad(bloque: Record<string, unknown> | null | undefined, actividadKey: string): boolean {
    const kpis = bloque?.['kpis'] as Record<string, unknown> | undefined;
    if (!kpis) return true;
    const a = Number(kpis[actividadKey] ?? 0);
    return Number.isNaN(a) || a <= 0;
  }

  private operacionSinDatosPeriodo(): boolean {
    if (!this.operacion) return true;
    const hist = this.operacion['histogramaTiemposEntrega'] as Record<string, number> | undefined;
    if (this.recordTieneDatos(hist)) return false;
    const ent = this.operacion['entregasPorRepartidor'] as Record<string, number> | undefined;
    if (this.recordTieneDatos(ent)) return false;
    const emb = this.operacion['embudoPorHora'] as { porEstado?: Record<string, number> }[] | undefined;
    if (emb?.length) {
      const hay = emb.some((row) =>
        Object.values(row.porEstado ?? {}).some((v) => Number(v) > 0),
      );
      if (hay) return false;
    }
    const caj = this.operacion['cajeroValidadosVsRechazados'] as unknown[] | undefined;
    return !this.listaTieneDatos(caj);
  }

  private inventarioSinDatosPeriodo(): boolean {
    if (!this.inventario) return true;
    const stock = this.inventario['stockPorInsumo'] as unknown[] | undefined;
    if (this.listaTieneDatos(stock)) return false;
    const consumo = this.inventario['consumoPorCategoria'] as Record<string, number> | undefined;
    if (this.recordTieneDatos(consumo)) return false;
    const abast = this.inventario['movimientosAbastecimientoPorSemana'] as
      | Record<string, number>
      | undefined;
    if (this.recordTieneDatos(abast)) return false;
    const marg = this.inventario['margenBrutoProductos'] as unknown[] | undefined;
    return !this.listaTieneDatos(marg);
  }

  kpiSinDatos(
    bloque: Record<string, unknown> | null | undefined,
    key: string,
    actividadKey?: string,
    modo: 'num' | 'text' = 'num',
  ): boolean {
    if (!bloque?.['kpis']) return true;
    if (bloque === this.operacion && this.operacionSinDatosPeriodo()) return true;
    if (bloque === this.inventario && this.inventarioSinDatosPeriodo()) return true;
    if (actividadKey && this.tabSinActividad(bloque, actividadKey)) return true;
    const v = (bloque['kpis'] as Record<string, unknown>)[key];
    if (v == null) return true;
    if (modo === 'text') return String(v).trim() === '';
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isNaN(n);
  }

  kpiValorClass(sinDatos: boolean): string {
    return sinDatos
      ? 'mt-1 text-sm text-neutral-strong dark:text-dark-text-muted'
      : 'mt-1 text-base font-semibold sm:text-lg';
  }

  private kpiDisplay(
    bloque: Record<string, unknown> | null | undefined,
    key: string,
    actividadKey: string | undefined,
    fmt: (v: unknown) => string,
    modo: 'num' | 'text' = 'num',
  ): string {
    if (this.kpiSinDatos(bloque, key, actividadKey, modo)) return this.msgSinDatos;
    const v = (bloque?.['kpis'] as Record<string, unknown> | undefined)?.[key];
    return fmt(v);
  }

  kpiSol(bloque: Record<string, unknown> | null | undefined, key: string, actividadKey?: string): string {
    return this.kpiDisplay(bloque, key, actividadKey, (v) => this.formatSol(v));
  }

  kpiNum(bloque: Record<string, unknown> | null | undefined, key: string, actividadKey?: string): string {
    return this.kpiDisplay(bloque, key, actividadKey, (v) => this.formatNum(v));
  }

  kpiPct(bloque: Record<string, unknown> | null | undefined, key: string, actividadKey?: string): string {
    return this.kpiDisplay(bloque, key, actividadKey, (v) => this.formatPct(v));
  }

  kpiTexto(bloque: Record<string, unknown> | null | undefined, key: string, actividadKey?: string): string {
    return this.kpiDisplay(
      bloque,
      key,
      actividadKey,
      (v) => String(v ?? ''),
      'text',
    );
  }

  kpiTextoInteracciones(key: string): string {
    if (!this.interacciones?.['kpis']) return this.msgSinDatos;
    if (this.kpiSinDatos(this.interacciones, 'interaccionesTotales', 'interaccionesTotales')) {
      return this.msgSinDatos;
    }
    const v = (this.interacciones['kpis'] as Record<string, unknown>)[key];
    if (v == null || String(v).trim() === '') return this.msgSinDatos;
    return String(v);
  }

  interaccionProductoMasVisto(): string {
    if (this.kpiSinDatos(this.interacciones, 'interaccionesTotales', 'interaccionesTotales')) {
      return this.msgSinDatos;
    }
    const n = this.interacciones?.['productoMasVistoNombre'];
    if (n == null || String(n).trim() === '') return this.msgSinDatos;
    return String(n);
  }

  kpiTextoProducto(campo: string): string {
    return this.kpiTexto(this.productos, campo, 'productosActivos');
  }

  tablaSinDatos(rows: unknown[] | null | undefined): boolean {
    return !rows?.length;
  }

  heatmapVentasSinDatos(): boolean {
    const list = this.ventas?.['heatmapHoraDia'] as { valor: number }[] | undefined;
    if (!list?.length) return true;
    return !list.some((x) => Number(x.valor) > 0);
  }

  private chartRegister(key: string, canvas: HTMLCanvasElement | null, config: any): void {
    if (!canvas) {
      this.sinDatosCharts.add(key);
      return;
    }
    this.patchChartOptions(config.options);
    ChartTester.logChart(key, config);
    this.charts.set(key, new Chart(canvas, config));
    this.sinDatosCharts.delete(key);
  }

  private refreshChartsForTheme(): void {
    for (const chart of this.charts.values()) {
      this.patchChartOptions(chart.options);
      chart.update();
    }
  }

  private destroyPrefix(prefix: string): void {
    for (const k of [...this.charts.keys()]) {
      if (k.startsWith(prefix)) {
        this.charts.get(k)?.destroy();
        this.charts.delete(k);
      }
    }
  }

  private destroyAllCharts(): void {
    for (const c of this.charts.values()) c.destroy();
    this.charts.clear();
    this.sinDatosCharts.clear();
  }

  private renderVentasCharts(): void {
    if (!this.ventas) return;
    this.destroyPrefix('vx-');
    this.prepararChartsSinDatos([
      'vx-line-dia',
      'vx-donut-estado',
      'vx-bar-hora',
      'vx-bar-dow',
      'vx-line-ticket',
      'vx-scatter-clima',
    ]);
    const t = this.tc();

    const ventasPorDia = this.ventas['ventasPorDia'] as Record<string, number> | undefined;
    if (ventasPorDia) {
      const labels = Object.keys(ventasPorDia);
      const data = labels.map((k) => Number(ventasPorDia[k]));
      const el = document.getElementById('vx-line-dia') as HTMLCanvasElement | null;
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'line',
          data: {
            labels,
            datasets: [{ label: 'Ventas (S/)', data, borderColor: '#2563eb', tension: 0.2 }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('vx-line-dia', el, config);
      }
    }

    const pedidosPorEstado = this.ventas['pedidosPorEstado'] as Record<string, number> | undefined;
    if (pedidosPorEstado) {
      const el = document.getElementById('vx-donut-estado') as HTMLCanvasElement | null;
      const labels = Object.keys(pedidosPorEstado);
      const data = labels.map((k) => Number(pedidosPorEstado[k]));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: ['#1e3a8a', '#f97316', '#10b981', '#a855f7', '#64748b', '#eab308'],
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: t.text } } },
          },
        };
        this.chartRegister('vx-donut-estado', el, config);
      }
    }

    const ingresoPorHora = this.ventas['ingresoPorHora'] as
      | { hora: number; monto: number }[]
      | undefined;
    if (ingresoPorHora?.length) {
      const el = document.getElementById('vx-bar-hora') as HTMLCanvasElement | null;
      const data = ingresoPorHora.map((x) => x.monto);
      if (el && this.seriesTieneDatos(data)) {
        const labels = ingresoPorHora.map((x) => String(x.hora));
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'S/', data, backgroundColor: '#ea580c' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('vx-bar-hora', el, config);
      }
    }

    const pedidosPorDiaSemana = this.ventas['pedidosPorDiaSemana'] as
      | Record<string, number>
      | undefined;
    if (pedidosPorDiaSemana) {
      const orderKeys = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
      const labels = this.diasSemanaLabel;
      const data = orderKeys.map((k) => pedidosPorDiaSemana[k] ?? 0);
      const el = document.getElementById('vx-bar-dow') as HTMLCanvasElement | null;
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Pedidos', data, backgroundColor: '#1d4ed8' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('vx-bar-dow', el, config);
      }
    }

    const ticketSem = this.ventas['evolucionTicketSemanal'] as
      | { semana: string; ticketPromedio: number }[]
      | undefined;
    if (ticketSem?.length) {
      const el = document.getElementById('vx-line-ticket') as HTMLCanvasElement | null;
      const data = ticketSem.map((x) => x.ticketPromedio);
      if (el && this.seriesTieneDatos(data)) {
        const labels = ticketSem.map((x) => x.semana);
        const config: any = {
          type: 'line',
          data: {
            labels,
            datasets: [{ label: 'Ticket promedio', data, borderColor: '#059669', tension: 0.2 }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('vx-line-ticket', el, config);
      }
    }

    const clima = this.ventas['climaTemperaturaVsMonto'] as
      | { tempC: number; monto: number }[]
      | undefined;
    if (clima?.length && clima.some((p) => p.monto > 0)) {
      const el = document.getElementById('vx-scatter-clima') as HTMLCanvasElement | null;
      if (el) {
        const config: any = {
          type: 'scatter',
          data: {
            datasets: [
              {
                label: 'Pedidos',
                data: clima.map((p) => ({ x: p.tempC, y: p.monto })),
                backgroundColor: '#7c3aed',
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: {
                title: { display: true, text: '°C', color: t.subtle },
                ticks: { color: t.subtle },
                grid: { color: t.grid },
              },
              y: {
                title: { display: true, text: 'S/', color: t.subtle },
                ticks: { color: t.subtle },
                grid: { color: t.grid },
              },
            },
          },
        };
        this.chartRegister('vx-scatter-clima', el, config);
      }
    }
  }

  heatmapMax(): number {
    const h = this.ventas?.['heatmapHoraDia'] as { valor: number }[] | undefined;
    if (!h?.length) return 1;
    return Math.max(1, ...h.map((x) => x.valor));
  }

  heatmapCell(h: number, d: number): number {
    const list = this.ventas?.['heatmapHoraDia'] as
      | { hora: number; diaIndex: number; valor: number }[]
      | undefined;
    if (!list) return 0;
    const hit = list.find((x) => x.hora === h && x.diaIndex === d);
    return hit?.valor ?? 0;
  }
  private renderInventarioCharts(): void {
    if (!this.inventario) {
      return;
    }
    this.destroyPrefix('ix-');
    this.prepararChartsSinDatos(['ix-bar-stock', 'ix-donut-cat', 'ix-line-abast', 'ix-bar-margen']);
    const t = this.tc();

    const stock = this.inventario['stockPorInsumo'] as any[];
    const elStock = document.getElementById('ix-bar-stock') as HTMLCanvasElement | null;
    if (elStock && stock?.length) {
      const top = [...stock].sort((a, b) => a.stock - b.stock).slice(0, 12);
      const config: any = {
        type: 'bar',
        data: {
          labels: top.map((x) => x.nombre),
          datasets: [
            { label: 'Stock', data: top.map((x) => x.stock), backgroundColor: '#0ea5e9' },
            { label: 'Umbral', data: top.map((x) => x.umbral), backgroundColor: '#f97316' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: t.text } } },
          scales: {
            x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
          },
        },
      };
      this.chartRegister('ix-bar-stock', elStock, config);
    }

    const consumoCat = this.inventario['consumoPorCategoria'] as Record<string, number> | undefined;
    const elConsumo = document.getElementById('ix-donut-cat') as HTMLCanvasElement | null;
    if (elConsumo && consumoCat && this.recordTieneDatos(consumoCat)) {
      const labels = Object.keys(consumoCat);
      const data = labels.map((k) => Number(consumoCat[k]));
      const config: any = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            { data, backgroundColor: ['#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#64748b'] },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: t.text } } },
        },
      };
      this.chartRegister('ix-donut-cat', elConsumo, config);
    }

    const abastSem = this.inventario['movimientosAbastecimientoPorSemana'] as
      | Record<string, number>
      | undefined;
    const elAbast = document.getElementById('ix-line-abast') as HTMLCanvasElement | null;
    if (elAbast && abastSem) {
      const labels = Object.keys(abastSem);
      const data = labels.map((k) => Number(abastSem[k]));
      if (this.seriesTieneDatos(data)) {
      const config: any = {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Abastecimiento (S/)', data, borderColor: '#059669', tension: 0.2 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: t.text } } },
          scales: {
            x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
          },
        },
      };
      this.chartRegister('ix-line-abast', elAbast, config);
      }
    }

    const marg = this.inventario['margenBrutoProductos'] as any[];
    const elMargen = document.getElementById('ix-bar-margen') as HTMLCanvasElement | null;
    if (elMargen && marg?.length) {
      const slice = marg.slice(0, 12);
      const config: any = {
        type: 'bar',
        data: {
          labels: slice.map((x) => x.nombre),
          datasets: [
            {
              label: 'Margen (S/)',
              data: slice.map((x) => x.margenBruto),
              backgroundColor: '#c026d3',
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
          },
        },
      };
      this.chartRegister('ix-bar-margen', elMargen, config);
    }
  }

  private renderProductosCharts(): void {
    if (!this.productos) return;
    this.destroyPrefix('px-');
    this.prepararChartsSinDatos(['px-bar-top', 'px-bar-margen', 'px-donut-ing', 'px-bar-stars']);
    const t = this.tc();

    const top = this.productos['topProductos'] as
      | { nombre: string; unidadesVendidas: number }[]
      | undefined;
    if (top?.length) {
      const el = document.getElementById('px-bar-top') as HTMLCanvasElement | null;
      if (el) {
        const slice = top.slice(0, 12);
        const config: any = {
          type: 'bar',
          data: {
            labels: slice.map((x) => x.nombre),
            datasets: [
              {
                label: 'Unidades',
                data: slice.map((x) => x.unidadesVendidas),
                backgroundColor: '#db2777',
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('px-bar-top', el, config);
      }
    }

    const topMargen = this.productos['topProductos'] as
      | { nombre: string; margenEstimado: number }[]
      | undefined;
    if (topMargen?.length) {
      const elM = document.getElementById('px-bar-margen') as HTMLCanvasElement | null;
      const sorted = [...topMargen]
        .sort((a, b) => b.margenEstimado - a.margenEstimado)
        .slice(0, 10);
      const margenData = sorted.map((x) => x.margenEstimado);
      if (elM && this.seriesTieneDatos(margenData)) {
        const config: any = {
          type: 'bar',
          data: {
            labels: sorted.map((x) => x.nombre),
            datasets: [
              {
                label: 'Margen estimado (S/)',
                data: sorted.map((x) => x.margenEstimado),
                backgroundColor: '#0f766e',
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('px-bar-margen', elM, config);
      }
    }

    const ingCat = this.productos['ingresosPorCategoria'] as Record<string, number> | undefined;
    if (ingCat) {
      const el = document.getElementById('px-donut-ing') as HTMLCanvasElement | null;
      const labels = Object.keys(ingCat);
      const data = labels.map((k) => Number(ingCat[k]));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data, backgroundColor: ['#2563eb', '#ea580c', '#22c55e', '#a855f7'] }],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: t.text } } },
          },
        };
        this.chartRegister('px-donut-ing', el, config);
      }
    }

    const dist = this.productos['distribucionEstrellas'] as Record<string, number> | undefined;
    if (dist) {
      const el = document.getElementById('px-bar-stars') as HTMLCanvasElement | null;
      const labels = ['1', '2', '3', '4', '5'];
      const data = labels.map((k) => Number(dist[k] ?? 0));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Cantidad', data, backgroundColor: '#eab308' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('px-bar-stars', el, config);
      }
    }
  }

  private renderClientesCharts(): void {
    if (!this.clientes) return;
    this.destroyPrefix('cx-');
    this.prepararChartsSinDatos(['cx-bar-stars', 'cx-bar-freq']);
    const t = this.tc();

    const dist = this.clientes['distribucionEstrellas'] as Record<string, number> | undefined;
    if (dist) {
      const el = document.getElementById('cx-bar-stars') as HTMLCanvasElement | null;
      const labels = ['1', '2', '3', '4', '5'];
      const data = labels.map((k) => Number(dist[k] ?? 0));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Valoraciones', data, backgroundColor: '#38bdf8' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('cx-bar-stars', el, config);
      }
    }

    const hist = this.clientes['frecuenciaPedidosHistograma'] as Record<string, number> | undefined;
    if (hist) {
      const el = document.getElementById('cx-bar-freq') as HTMLCanvasElement | null;
      const labels = Object.keys(hist);
      const data = labels.map((k) => Number(hist[k]));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Clientes', data, backgroundColor: '#4f46e5' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('cx-bar-freq', el, config);
      }
    }
  }

  private renderOperacionCharts(): void {
    if (!this.operacion) return;
    this.destroyPrefix('ox-');
    this.prepararChartsSinDatos(['ox-bar-hist', 'ox-bar-rep', 'ox-bar-cajero', 'ox-line-embudo']);
    const t = this.tc();

    const histEnt = this.operacion['histogramaTiemposEntrega'] as
      | Record<string, number>
      | undefined;
    if (histEnt && Object.keys(histEnt).length) {
      const el = document.getElementById('ox-bar-hist') as HTMLCanvasElement | null;
      if (el) {
        const order = ['0-20', '20-40', '40-60', '60+'];
        const labels = order.filter((k) => k in histEnt);
        const data = labels.map((k) => histEnt[k]);
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Pedidos', data, backgroundColor: '#6366f1' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('ox-bar-hist', el, config);
      }
    }

    const ent = this.operacion['entregasPorRepartidor'] as Record<string, number> | undefined;
    if (ent && Object.keys(ent).length) {
      const el = document.getElementById('ox-bar-rep') as HTMLCanvasElement | null;
      if (el) {
        const labels = Object.keys(ent);
        const data = labels.map((k) => ent[k]);
        const config: any = {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Entregas', data, backgroundColor: '#0d9488' }] },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('ox-bar-rep', el, config);
      }
    }

    const caj = this.operacion['cajeroValidadosVsRechazados'] as
      | { cajero: string; validados: number; rechazados: number }[]
      | undefined;
    if (caj?.length) {
      const el = document.getElementById('ox-bar-cajero') as HTMLCanvasElement | null;
      if (el) {
        const labels = caj.map((x) => x.cajero);
        const config: any = {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Superaron validación',
                data: caj.map((x) => x.validados),
                backgroundColor: '#2563eb',
              },
              {
                label: 'Cancelados en caja',
                data: caj.map((x) => x.rechazados),
                backgroundColor: '#dc2626',
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('ox-bar-cajero', el, config);
      }
    }

    const emb = this.operacion['embudoPorHora'] as
      | { hora: number; porEstado: Record<string, number> }[]
      | undefined;
    if (emb?.length) {
      const estados = new Set<string>();
      emb.forEach((e) => Object.keys(e.porEstado ?? {}).forEach((s) => estados.add(s)));
      const estadoList = [...estados].slice(0, 6);
      const labels = emb.map((x) => String(x.hora));
      const colors = ['#1e3a8a', '#ea580c', '#16a34a', '#a855f7', '#dc2626', '#ca8a04'];
      const el = document.getElementById('ox-line-embudo') as HTMLCanvasElement | null;
      if (el) {
        const config: any = {
          type: 'line',
          data: {
            labels,
            datasets: estadoList.map((st, i) => ({
              label: st,
              data: emb.map((row) => row.porEstado[st] ?? 0),
              borderColor: colors[i % colors.length],
              tension: 0.2,
              fill: false,
            })),
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('ox-line-embudo', el, config);
      }
    }
  }

  private renderSeguridadCharts(): void {
    if (!this.seguridad) return;
    this.destroyPrefix('sx-');
    this.prepararChartsSinDatos(['sx-line-login', 'sx-donut-res']);
    const t = this.tc();

    const porHora = this.seguridad['intentosPorHora'] as
      | { hora: number; success: number; failed: number; blocked: number }[]
      | undefined;
    if (porHora?.length) {
      const el = document.getElementById('sx-line-login') as HTMLCanvasElement | null;
      const totalIntentos = porHora.reduce(
        (s, x) => s + x.success + x.failed + x.blocked,
        0,
      );
      if (el && totalIntentos > 0) {
        const labels = porHora.map((x) => String(x.hora));
        const config: any = {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Éxito',
                data: porHora.map((x) => x.success),
                borderColor: '#22c55e',
                tension: 0.2,
              },
              {
                label: 'Fallo',
                data: porHora.map((x) => x.failed),
                borderColor: '#ef4444',
                tension: 0.2,
              },
              {
                label: 'Bloqueo',
                data: porHora.map((x) => x.blocked),
                borderColor: '#a855f7',
                tension: 0.2,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: t.text } } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('sx-line-login', el, config);
      }
    }

    const kp = this.seguridad['kpis'] as
      | { totalIntentos?: number; eventosBloqueo?: number; intentosFallidos?: number }
      | undefined;
    const ok = (kp?.totalIntentos ?? 0) - (kp?.intentosFallidos ?? 0) - (kp?.eventosBloqueo ?? 0);
    const elDon = document.getElementById('sx-donut-res') as HTMLCanvasElement | null;
    if (elDon && kp?.totalIntentos && kp.totalIntentos > 0) {
      const config: any = {
        type: 'doughnut',
        data: {
          labels: ['Éxito', 'Fallo', 'Bloqueo'],
          datasets: [
            {
              data: [Math.max(0, ok), kp.intentosFallidos ?? 0, kp.eventosBloqueo ?? 0],
              backgroundColor: ['#22c55e', '#ef4444', '#a855f7'],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: t.text } } },
        },
      };
      this.chartRegister('sx-donut-res', elDon, config);
    }
  }

  private renderInteraccionesCharts(): void {
    if (!this.interacciones) return;
    this.destroyPrefix('ux-');
    this.prepararChartsSinDatos(['ux-donut-acc', 'ux-bar-seg']);
    const t = this.tc();

    const dist = this.interacciones['distribucionAcciones'] as Record<string, number> | undefined;
    if (dist) {
      const el = document.getElementById('ux-donut-acc') as HTMLCanvasElement | null;
      const labels = Object.keys(dist);
      const data = labels.map((k) => Number(dist[k]));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              { data, backgroundColor: ['#6366f1', '#f97316', '#14b8a6', '#ec4899', '#84cc16'] },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: t.text } } },
          },
        };
        this.chartRegister('ux-donut-acc', el, config);
      }
    }

    const seg = this.interacciones['porSegmentoDia'] as Record<string, number> | undefined;
    if (seg) {
      const el = document.getElementById('ux-bar-seg') as HTMLCanvasElement | null;
      const labels = Object.keys(seg);
      const data = labels.map((k) => Number(seg[k]));
      if (el && this.seriesTieneDatos(data)) {
        const config: any = {
          type: 'bar',
          data: {
            labels,
            datasets: [{ label: 'Interacciones', data, backgroundColor: '#8b5cf6' }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: t.subtle }, grid: { color: t.grid } },
              y: { ticks: { color: t.subtle }, grid: { color: t.grid } },
            },
          },
        };
        this.chartRegister('ux-bar-seg', el, config);
      }
    }
  }

  formatSol(n: unknown): string {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
    return (
      'S/ ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  formatPct(n: unknown): string {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
    return v.toLocaleString('es-PE', { maximumFractionDigits: 2 }) + '%';
  }

  formatNum(n: unknown): string {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
    return v.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }

  get pestanaLabelActual(): string {
    return this.tabs.find((t) => t.id === this.pestana)?.label ?? this.pestana;
  }

  abrirModalExportar(): void {
    if (this.exportandoReporte) {
      return;
    }
    this.modalExportOpciones = {
      visible: true,
      format: 'PDF',
      includeKpis: true,
      includeCharts: true,
      includeTables: true,
    };
    this.cdr.detectChanges();
  }

  cerrarModalExportOpciones(): void {
    this.modalExportOpciones.visible = false;
    this.cdr.detectChanges();
  }

  confirmarExportar(): void {
    if (this.exportandoReporte) {
      return;
    }
    const tab = this.pestana;
    const tabInfo = this.tabs.find((t) => t.id === tab);
    const tabLabel = tabInfo?.label ?? tab;
    this.modalExportOpciones.visible = false;
    this.exportandoReporte = true;
    this.detenerPollingReporte();
    this.reportJobId = null;

    const body = {
      tab,
      format: this.modalExportOpciones.format,
      includeKpis: this.modalExportOpciones.includeKpis,
      includeCharts: this.modalExportOpciones.includeCharts,
      includeTables: this.modalExportOpciones.includeTables,
      filters: this.buildExportFilters(),
    };

    this.http
      .post<{
        message?: string;
        fileName?: string;
        jobId?: string;
        tabLabel?: string;
      }>(`${API}/export/solicitar`, body)
      .subscribe({
        next: (resp) => {
          this.ngZone.run(() => {
            this.reportJobId = resp?.jobId ?? null;
            const fileName = resp?.fileName || `reporte_dashboard_${tab}.pdf`;
            this.modalReporte = {
              visible: true,
              fase: 'pendiente',
              tabLabel: resp?.tabLabel || tabLabel,
              fileName,
              downloadUrl: '',
              mensaje:
                resp?.message || 'Generando reporte... Te avisaremos cuando esté listo.',
            };
            this.iniciarPollingReporte();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.exportandoReporte = false;
            this.reportJobId = null;
            this.errorMsg =
              err?.error?.message || 'No se pudo iniciar la generación del reporte.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  cerrarModalReporte(): void {
    this.modalReporte.visible = false;
    if (this.modalReporte.fase !== 'pendiente') {
      this.exportandoReporte = false;
      this.reportJobId = null;
      this.detenerPollingReporte();
    }
    this.cdr.detectChanges();
  }

  private buildExportFilters(): Record<string, unknown> {
    const f: Record<string, unknown> = {};
    if (this.pestana !== 'inventario_prediccion') {
      f['fromDate'] = this.fromDate;
      f['toDate'] = this.toDate;
    }
    if (this.pestana === 'ventas') {
      if (this.filtroEstado) f['status'] = this.filtroEstado;
      if (this.filtroMomento) f['momentOfDay'] = this.filtroMomento;
      if (this.filtroDiaSemana) f['dayOfWeek'] = this.filtroDiaSemana;
      if (this.filtroClima) f['weatherCondition'] = this.filtroClima;
    } else if (this.pestana === 'inventario') {
      if (this.filtroCatInsumo) f['categoriaInsumo'] = this.filtroCatInsumo;
      if (this.filtroMovTipo) f['tipoMovimiento'] = this.filtroMovTipo;
      f['soloStockBajo'] = this.soloStockBajo;
      f['umbralStockBajo'] = this.umbralStock;
    } else if (this.pestana === 'productos') {
      if (this.filtroCatProducto) f['categoriaProducto'] = this.filtroCatProducto;
      if (this.filtroEstrellasMin != null) f['estrellasMin'] = this.filtroEstrellasMin;
      if (this.filtroRangoPrecio) f['rangoPrecio'] = this.filtroRangoPrecio;
      if (this.filtroRangoPrecio === 'LT25') f['precioMax'] = 25;
      else if (this.filtroRangoPrecio === '25_50') {
        f['precioMin'] = 25;
        f['precioMax'] = 50;
      } else if (this.filtroRangoPrecio === 'GT50') f['precioMin'] = 50;
    } else if (this.pestana === 'clientes') {
      if (this.regDesde) f['regFrom'] = this.regDesde;
      if (this.regHasta) f['regTo'] = this.regHasta;
      f['soloRecurrentes'] = this.soloRecurrentes;
    } else if (this.pestana === 'seguridad') {
      if (this.filtroLoginStatus) f['loginStatus'] = this.filtroLoginStatus;
      if (this.filtroRolLogin) f['rol'] = this.filtroRolLogin;
    } else if (this.pestana === 'interacciones') {
      if (this.filtroAccionIx) f['action'] = this.filtroAccionIx;
      if (this.filtroClimaIx) f['condicionClima'] = this.filtroClimaIx;
      if (this.filtroSegmentoIx) f['segmento'] = this.filtroSegmentoIx;
    } else if (this.pestana === 'inventario_prediccion') {
      f['horizonteInv'] = this.horizonteInv;
    }
    return f;
  }

  private iniciarPollingReporte(): void {
    this.detenerPollingReporte();
    if (!this.reportJobId) {
      return;
    }
    this.consultarEstadoReporte();
    this.pollReportTimer = setInterval(() => this.consultarEstadoReporte(), 3000);
  }

  private detenerPollingReporte(): void {
    if (this.pollReportTimer != null) {
      clearInterval(this.pollReportTimer);
      this.pollReportTimer = null;
    }
  }

  private consultarEstadoReporte(): void {
    if (!this.reportJobId) {
      return;
    }
    this.http
      .get<{
        status?: string;
        tabLabel?: string;
        fileName?: string;
        downloadUrl?: string;
        message?: string;
      }>(`${API}/export/jobs/${this.reportJobId}`)
      .subscribe({
        next: (estado) => {
          this.ngZone.run(() => {
            this.aplicarEstadoReporte(estado);
            this.cdr.detectChanges();
          });
        },
        error: () => {},
      });
  }

  private aplicarEstadoReporte(estado: {
    status?: string;
    tabLabel?: string;
    fileName?: string;
    downloadUrl?: string;
    message?: string;
  }): void {
    const status = String(estado?.status || '').toUpperCase();
    const tabLabel = estado?.tabLabel || this.modalReporte.tabLabel;
    const fileName = estado?.fileName || this.modalReporte.fileName;

    if (status === 'READY' && estado?.downloadUrl) {
      this.detenerPollingReporte();
      this.exportandoReporte = false;
      this.modalReporte = {
        visible: true,
        fase: 'listo',
        tabLabel,
        fileName,
        downloadUrl: estado.downloadUrl,
        mensaje: 'El reporte está listo para descargar.',
      };
      return;
    }

    if (status === 'FAILED') {
      this.detenerPollingReporte();
      this.exportandoReporte = false;
      this.modalReporte = {
        visible: true,
        fase: 'error',
        tabLabel,
        fileName,
        downloadUrl: '',
        mensaje: estado?.message || 'No se pudo generar el reporte.',
      };
    }
  }

  private onReporteWs(raw: string): void {
    this.ngZone.run(() => {
      try {
        const o = JSON.parse(raw) as {
          kind?: string;
          jobId?: string;
          tabLabel?: string;
          fileName?: string;
          downloadUrl?: string;
          message?: string;
        };
        if (this.reportJobId && o.jobId && o.jobId !== this.reportJobId) {
          return;
        }
        if (o.kind === 'dashboard_report_ready' && o.downloadUrl) {
          this.detenerPollingReporte();
          this.exportandoReporte = false;
          this.modalReporte = {
            visible: true,
            fase: 'listo',
            tabLabel: o.tabLabel || this.modalReporte.tabLabel,
            fileName: o.fileName || this.modalReporte.fileName,
            downloadUrl: o.downloadUrl,
            mensaje: 'El reporte está listo para descargar.',
          };
          this.cdr.detectChanges();
          return;
        }
        if (o.kind === 'dashboard_report_failed') {
          this.detenerPollingReporte();
          this.exportandoReporte = false;
          this.modalReporte = {
            visible: true,
            fase: 'error',
            tabLabel: o.tabLabel || this.modalReporte.tabLabel,
            fileName: o.fileName || this.modalReporte.fileName,
            downloadUrl: '',
            mensaje: o.message || 'No se pudo generar el reporte.',
          };
          this.cdr.detectChanges();
        }
      } catch {
        return;
      }
    });
  }

  realizarPrediccionInv(): void {
    this.predInvCargando = true;
    this.predInvError = '';
    this.prediccionInv = null;
    this.cdr.detectChanges();
    this.http
      .post<Record<string, unknown>>(`${API}/inventario-prediccion`, {})
      .pipe(finalize(() => this.finishPrediccionInvRequest()))
      .subscribe({
        next: (d) =>
          this.ngZone.run(() => {
            this.prediccionInv = this.normalizePrediccionPayload(d);
            const def = this.prediccionInv?.['defaultHorizon'];
            if (typeof def === 'string') this.horizonteInv = def;
            this.cdr.detectChanges();
          }),
        error: (err) =>
          this.ngZone.run(() => {
            const msg = err?.error?.message;
            this.predInvError =
              typeof msg === 'string' ? msg : 'No se pudo ejecutar la predicción.';
            this.cdr.detectChanges();
          }),
      });
  }

  private finishPrediccionInvRequest(): void {
    this.ngZone.run(() => {
      this.predInvCargando = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private normalizePrediccionPayload(raw: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (raw == null || typeof raw !== 'object') return null;
    const o = { ...raw };
    o['items'] = this.coerceArray(o['items']);
    o['horizonKeys'] = this.coerceArray(o['horizonKeys']).map(String);
    const hm = o['heatmap'];
    if (hm != null && typeof hm === 'object' && !Array.isArray(hm)) {
      const h = hm as Record<string, unknown>;
      o['heatmap'] = {
        ...h,
        filas: this.coerceArray(h['filas']).map(String),
        columnas: this.coerceArray(h['columnas']).map(String),
        valores: this.coerceNestedNumberArray(h['valores']),
        keys: this.coerceArray(h['keys']).map(String),
      };
    }
    return o;
  }

  private coerceArray(v: unknown): unknown[] {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'object') return Object.values(v as object);
    return [];
  }

  private coerceNestedNumberArray(v: unknown): number[][] {
    const rows = this.coerceArray(v);
    const out: number[][] = [];
    for (const row of rows) {
      const r = this.coerceArray(row);
      out.push(
        r.map((x) =>
          typeof x === 'number' && !Number.isNaN(x)
            ? x
            : parseFloat(String(x ?? '0'))
        )
      );
    }
    return out;
  }

  setHorizonteInv(k: string): void {
    this.horizonteInv = k;
  }

  prediccionItems(): Record<string, unknown>[] {
    const raw = this.prediccionInv?.['items'];
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x));
  }

  horizonKeysList(): string[] {
    const raw = this.prediccionInv?.['horizonKeys'];
    if (!Array.isArray(raw)) return [];
    return raw.map(String);
  }

  horizonLabel(hk: string): string {
    const labels = this.prediccionInv?.['horizonLabels'];
    if (labels != null && typeof labels === 'object' && !Array.isArray(labels)) {
      const v = (labels as Record<string, unknown>)[hk];
      if (typeof v === 'string') return v;
    }
    return hk;
  }

  private heatmapBucket(): Record<string, unknown> | null {
    const h = this.prediccionInv?.['heatmap'];
    if (h == null || typeof h !== 'object' || Array.isArray(h)) return null;
    return h as Record<string, unknown>;
  }

  heatmapColumnas(): string[] {
    const c = this.heatmapBucket()?.['columnas'];
    if (!Array.isArray(c)) return [];
    return c.map(String);
  }

  heatmapFilas(): string[] {
    const c = this.heatmapBucket()?.['filas'];
    if (!Array.isArray(c)) return [];
    return c.map(String);
  }

  heatmapValoresRow(rowIndex: number): number[] {
    const v = this.heatmapBucket()?.['valores'];
    if (!Array.isArray(v)) return [];
    const row = v[rowIndex];
    if (!Array.isArray(row)) return [];
    return row.map((x) => (typeof x === 'number' && !Number.isNaN(x) ? x : parseFloat(String(x ?? '0'))));
  }

  private bloqueHorizonteActual(it: Record<string, unknown>): Record<string, unknown> | null {
    const preds = it['predicciones'];
    if (preds == null || typeof preds !== 'object' || Array.isArray(preds)) return null;
    const blk = (preds as Record<string, unknown>)[this.horizonteInv];
    if (blk == null || typeof blk !== 'object' || Array.isArray(blk)) return null;
    return blk as Record<string, unknown>;
  }

  predInvCampo(it: Record<string, unknown>, key: string): unknown {
    return this.bloqueHorizonteActual(it)?.[key];
  }

  numPredInv(it: Record<string, unknown>, key: string): number | null {
    const v = this.predInvCampo(it, key);
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v ?? ''));
    return Number.isNaN(n) ? null : n;
  }

  alertasInv(): { name: string; mensaje: string }[] {
    const items = this.prediccionItems();
    if (!items.length) return [];
    const rows = items
      .map((it) => {
        const blk = this.bloqueHorizonteActual(it);
        return { it, p: blk };
      })
      .filter((x): x is { it: Record<string, unknown>; p: Record<string, unknown> } => {
        return x.p != null && Boolean(x.p['alerta']);
      })
      .sort(
        (a, b) =>
          (Number(a.p['diasHastaAgotamiento']) || 9999) - (Number(b.p['diasHastaAgotamiento']) || 9999)
      )
      .slice(0, 12)
      .map(({ it, p }) => {
        const dias = Number(p['diasHastaAgotamiento']) || 0;
        const mensaje =
          dias >= 9980
            ? 'Riesgo alto de agotamiento en el horizonte seleccionado.'
            : `Te quedan ${this.formatNum(dias)} días para que se agote este ingrediente.`;
        return { name: String(it['name'] ?? ''), mensaje };
      });
    return rows;
  }

  barClassPct(pct: unknown): string {
    const v = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0));
    if (v >= 80) return 'bg-red-600';
    if (v >= 50) return 'bg-amber-500';
    return 'bg-emerald-600';
  }

  min100(pct: unknown): number {
    const v = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0));
    return Math.max(0, Math.min(100, v));
  }

  heatColor(pct: unknown): string {
    const v = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0));
    const dark = this.theme.isDark();
    if (v >= 80) return dark ? 'rgba(185, 28, 28, 0.88)' : 'rgba(220, 38, 38, 0.78)';
    if (v >= 50) return dark ? 'rgba(202, 138, 4, 0.55)' : 'rgba(234, 179, 8, 0.5)';
    return dark ? 'rgba(22, 163, 74, 0.5)' : 'rgba(34, 197, 94, 0.42)';
  }
}
