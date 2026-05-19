import { Component, OnInit } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { environment } from '@env/environment'; 

export interface CatOpcion {
  value: string;
  label: string;
  img: string;
}

type SlotEstado = 'VACIO' | 'CARGANDO' | 'ACTIVO';

interface IaSlot {
  slotNumber: number;
  titulo: string;
  status: SlotEstado;
  modelFileName?: string;
  encodersFileName?: string;
  uploadedAt?: string;
}

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LogoutButtonComponent, NgIconComponent],
  templateUrl: './admin-productos.component.html',
})
export class AdminProductosComponent implements OnInit {
  readonly categoriasProducto: CatOpcion[] = [
    { value: 'Entrada', label: 'Entrada', img: 'heroQueueList' },
    {
      value: 'Plato Principal',
      label: 'Plato Principal',
      img: 'heroBeaker',
    },
    { value: 'Postres', label: 'Postres', img: 'heroCake' },
    { value: 'Bebidas', label: 'Bebidas', img: 'heroBeaker' },
  ];

  readonly categoriasIngrediente: CatOpcion[] = [
    { value: 'Verduras', label: 'Verduras', img: 'heroSparkles' },
    { value: 'Carnes', label: 'Carnes', img: 'heroFire' },
    { value: 'Huevos', label: 'Huevos', img: 'heroCircleStack' },
    { value: 'Marinos', label: 'Marinos', img: 'heroBeaker' },
    { value: 'Abarrotes', label: 'Abarrotes', img: 'heroArchiveBox' },
    { value: 'Lácteos', label: 'Lácteos', img: 'heroBeaker' },
    { value: 'Bebidas', label: 'Bebidas', img: 'heroBeaker' },
    { value: 'Frutas', label: 'Frutas', img: 'heroSparkles' },
    { value: 'Panadería', label: 'Panadería', img: 'heroCake' },
  ];

  private readonly apiCatalogo = environment.apiUrl + '/catalogo';
  private readonly apiIa = environment.apiUrl + '/ia-modelos';

  pestanaActiva = 'ingredientes';
  cargando = false;
  cargandoIa = false;
  guardandoIa = false;
  modal = { visible: false, tipo: 'info', titulo: '', mensaje: '' };
  iaActiva = false;
  slotsIa: IaSlot[] = [];
  archivoModeloIa: File | null = null;
  archivoEncodersIa: File | null = null;

  nuevoIngrediente = {
    name: '',
    unit: 'UNIDADES',
    stockQuantity: 0,
    category: 'Verduras',
    price: 0,
    imageBase64: '',
  };
  ingredienteStockText = '0';
  ingredienteCostoText = '0';

  ingredientes: any[] = [];

  nuevoProducto: any = {
    name: '',
    price: 0.1,
    category: 'Entrada',
    description: '',
    imagesBase64: [],
  };
  productoPrecioText = '0.10';

  recetaActual: { ingredientId: number; name: string; quantity: number; unit: string }[] = [];
  ingredienteSeleccionadoId: number | string = '';
  cantidadRecetaText = '1';

  busquedaReceta = '';
  filtroCategoriaReceta: string = 'ALL';

  busquedaAlmacen = '';
  filtroCategoriaAlmacen: string = 'ALL';
  ingredienteSeleccionadoAlmacenId: number | '' = '';

  busquedaCatalogo = '';
  filtroCategoriaCatalogo: string = 'ALL';

  modalAbastecer: { visible: boolean; insumo: any | null } = { visible: false, insumo: null };
  abastecerCantidadText = '1';
  abastecerCostoText = '';
  abastecerRazonText = '';

  modalOrdenBloqueo = { visible: false, mensaje: '' };
  modalConfirmarProducto = { visible: false, productoId: '' };
  modalAdvertenciaIngrediente = { visible: false, insumoId: 0, productos: [] as string[] };
  modalConfirmarIngrediente = { visible: false, insumoId: 0 };

  modalEditarIngrediente = { visible: false };
  editIngredienteId: number | null = null;
  editIngrediente: any = {
    name: '',
    unit: 'UNIDADES',
    stockQuantity: 0,
    category: 'Verduras',
    price: 0,
    imageBase64: '',
  };
  editIngredienteStockText = '0';
  editIngredienteCostoText = '0';
  unidadOriginalEdicion = '';
  modalCambioUnidadIngrediente = { visible: false, productos: [] as string[] };

  modalEditarProducto = { visible: false };
  editandoProductoId: string | null = null;
  edicionProductoRestringida = false;
  editProducto: any = {
    name: '',
    price: 0.1,
    category: 'Entrada',
    description: '',
    imagesBase64: [] as string[],
  };
  editProductoPrecioText = '0.10';
  editRecetaActual: { ingredientId: number; name: string; quantity: number; unit: string }[] = [];
  editIngredienteSeleccionadoId: number | string = '';
  editCantidadRecetaText = '1';
  editBusquedaReceta = '';
  editFiltroCategoriaReceta: string = 'ALL';

  readonly msgTooltipEdicionBloqueada =
    'No puedes modificar el precio ni la receta de este producto mientras existan órdenes en curso para asegurar la consistencia en cocina y caja.';

  productos: any[] = [];
  private readonly tiposImagenPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];
  private readonly maxBytesImagen = 5 * 1024 * 1024;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cambiarPestana(pestana: string) {
    this.pestanaActiva = pestana;
  }

  cargarConfiguracionIa() {
    this.cargandoIa = true;
    this.http.get<any>(`${this.apiIa}`).subscribe({
      next: (resp) => {
        this.cargandoIa = false;
        this.iaActiva = !!resp?.iaActiva;
        this.slotsIa = Array.isArray(resp?.slots) ? resp.slots : [];
      },
      error: () => {
        this.cargandoIa = false;
        this.abrirModal('error', 'IA', 'No se pudo cargar la configuración de modelos IA.');
      },
    });
  }

  onArchivoModeloIaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.keras')) {
      this.abrirModal('error', 'Archivo inválido', 'Solo se permite archivo .keras para el modelo.');
      input.value = '';
      this.archivoModeloIa = null;
      return;
    }
    this.archivoModeloIa = file;
  }

  onArchivoEncodersIaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.abrirModal('error', 'Archivo inválido', 'Solo se permite archivo .json para encoders.');
      input.value = '';
      this.archivoEncodersIa = null;
      return;
    }
    this.archivoEncodersIa = file;
  }

  async guardarModeloIaSlot1() {
    if (!this.archivoModeloIa || !this.archivoEncodersIa) {
      this.abrirModal('error', 'Archivos requeridos', 'Debes cargar el archivo .keras y el archivo .json.');
      return;
    }
    this.guardandoIa = true;
    try {
      const modelFileBase64 = await this.fileToBase64(this.archivoModeloIa);
      const encodersFileBase64 = await this.fileToBase64(this.archivoEncodersIa);
      this.http
        .post<any>(`${this.apiIa}/slot-1/upload`, {
          modelFileName: this.archivoModeloIa.name,
          modelFileBase64,
          encodersFileName: this.archivoEncodersIa.name,
          encodersFileBase64,
        })
        .subscribe({
          next: (resp) => {
            this.guardandoIa = false;
            this.iaActiva = !!resp?.iaActiva;
            this.slotsIa = Array.isArray(resp?.slots) ? resp.slots : [];
            this.archivoModeloIa = null;
            this.archivoEncodersIa = null;
            this.abrirModal('exito', 'IA', 'Modelo y encoders cargados correctamente en Slot 1.');
          },
          error: (err) => {
            this.guardandoIa = false;
            this.abrirModal('error', 'IA', err?.error?.message || 'No se pudo cargar el modelo IA.');
          },
        });
    } catch {
      this.guardandoIa = false;
      this.abrirModal('error', 'IA', 'No se pudo procesar el archivo seleccionado.');
    }
  }

  actualizarSwitchIa() {
    this.guardandoIa = true;
    this.http.patch<any>(`${this.apiIa}/toggle`, { iaActiva: this.iaActiva }).subscribe({
      next: (resp) => {
        this.guardandoIa = false;
        this.iaActiva = !!resp?.iaActiva;
        this.slotsIa = Array.isArray(resp?.slots) ? resp.slots : [];
      },
      error: () => {
        this.guardandoIa = false;
        this.iaActiva = !this.iaActiva;
        this.abrirModal('error', 'IA', 'No se pudo actualizar el interruptor maestro de IA.');
      },
    });
  }

  textoEstadoSlot(status: SlotEstado): string {
    if (status === 'ACTIVO') return 'ACTIVO';
    if (status === 'CARGANDO') return 'CARGANDO';
    return 'VACIO';
  }

  claseEstadoSlot(status: SlotEstado): string {
    if (status === 'ACTIVO') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:text-emerald-200';
    }
    if (status === 'CARGANDO') {
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-200';
    }
    return 'border-gray-200 bg-gray-100 text-neutral-strong dark:border-dark-border dark:bg-slate-900 dark:text-dark-text-muted';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer archivo.'));
      reader.readAsDataURL(file);
    });
  }

  cargarDatos() {
    this.http.get<any[]>(`${this.apiCatalogo}/ingredientes`).subscribe({
      next: (data) => (this.ingredientes = data),
      error: (err) => console.error('Error cargando ingredientes', err),
    });

    this.http.get<any[]>(`${this.apiCatalogo}/productos`).subscribe({
      next: (data) => (this.productos = data),
      error: (err) => console.error('Error cargando productos', err),
    });
  }

  seleccionarCategoriaIngrediente(cat: string) {
    this.nuevoIngrediente.category = cat;
    this.onCambioUnidadIngrediente();
  }

  seleccionarCategoriaProducto(cat: string) {
    this.nuevoProducto.category = cat;
  }

  onCambioUnidadIngrediente() {
    if (this.nuevoIngrediente.unit === 'UNIDADES') {
      this.ingredienteStockText = this.sinDecimalesTexto(this.ingredienteStockText);
    }
  }

  onCambioUnidadEditIngrediente() {
    if (this.editIngrediente.unit === 'UNIDADES') {
      this.editIngredienteStockText = this.sinDecimalesTexto(this.editIngredienteStockText);
    }
  }

  get insumosFiltradosRecetaEdit(): any[] {
    const q = this.normalizarTexto(this.editBusquedaReceta);
    return this.ingredientes.filter((i) => {
      if (
        this.editFiltroCategoriaReceta !== 'ALL' &&
        i.category !== this.editFiltroCategoriaReceta
      ) {
        return false;
      }
      if (!q) return true;
      return this.normalizarTexto(i.name).includes(q);
    });
  }

  get unidadInsumoSeleccionadoEdit(): string {
    if (!this.editIngredienteSeleccionadoId) return 'UNIDADES';
    const i = this.ingredientes.find((x) => x.id == this.editIngredienteSeleccionadoId);
    return (i?.unit as string) || 'UNIDADES';
  }

  abrirEditarIngrediente(ing: any, ev?: Event) {
    ev?.stopPropagation();
    this.editIngredienteId = ing.id;
    this.editIngrediente = {
      name: ing.name ?? '',
      unit: ing.unit ?? 'UNIDADES',
      stockQuantity: ing.stockQuantity ?? 0,
      category: ing.category ?? 'Verduras',
      price: ing.price ?? 0,
      imageBase64: ing.imageBase64 ?? '',
    };
    this.editIngredienteStockText = String(ing.stockQuantity ?? 0);
    this.editIngredienteCostoText = String(ing.price ?? 0);
    this.unidadOriginalEdicion = (ing.unit ?? 'UNIDADES').trim();
    this.modalEditarIngrediente = { visible: true };
  }

  cerrarModalEditarIngrediente() {
    this.modalEditarIngrediente = { visible: false };
    this.editIngredienteId = null;
    this.modalCambioUnidadIngrediente = { visible: false, productos: [] };
  }

  onEditSingleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const error = this.errorArchivoImagen(file);
      if (error) {
        this.abrirModal('error', 'Archivo inválido', error);
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => (this.editIngrediente.imageBase64 = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  guardarEdicionIngrediente(confirmarCambioUnidad = false) {
    if (this.editIngredienteId == null) return;
    if (!this.editIngrediente.name?.trim()) {
      return this.abrirModal('error', 'Datos inválidos', 'El insumo necesita nombre.');
    }
    const foto = (this.editIngrediente.imageBase64 || '').trim();
    if (!foto) {
      return this.abrirModal(
        'error',
        'Foto obligatoria',
        'Debes mantener o reemplazar la foto del insumo.',
      );
    }

    const unit = this.editIngrediente.unit;
    const maxDec = unit === 'UNIDADES' ? 0 : 2;
    const stock = this.parseNumeroFlexible(this.editIngredienteStockText, {
      maxDecimals: maxDec,
      integerOnly: unit === 'UNIDADES',
    });
    if (stock === null) {
      return this.abrirModal(
        'error',
        'Stock inválido',
        unit === 'UNIDADES'
          ? 'Stock: solo números enteros positivos o cero, sin decimales.'
          : 'Stock: números positivos o cero, máximo dos decimales.',
      );
    }

    const costo = this.parseNumeroFlexible(this.editIngredienteCostoText, {
      maxDecimals: 3,
      integerOnly: false,
      min: 0,
    });
    if (costo === null) {
      return this.abrirModal(
        'error',
        'Costo inválido',
        'Costo unitario: no negativo, máximo tres decimales.',
      );
    }

    this.editIngrediente.stockQuantity = stock;
    this.editIngrediente.price = costo;

    const payload = {
      name: this.editIngrediente.name.trim(),
      category: this.editIngrediente.category,
      unit: this.editIngrediente.unit,
      stockQuantity: stock,
      price: costo,
      imageBase64: foto,
      confirmarCambioUnidad: confirmarCambioUnidad,
    };

    this.cargando = true;
    this.http.put(`${this.apiCatalogo}/ingredientes/${this.editIngredienteId}`, payload).subscribe({
      next: () => {
        this.cargando = false;
        this.cerrarModalEditarIngrediente();
        this.abrirModal('exito', 'Guardado', 'Insumo actualizado correctamente.');
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 409 && err.error?.code === 'UNIT_CHANGE_WARNING') {
          this.modalCambioUnidadIngrediente = {
            visible: true,
            productos: (err.error?.productos as string[]) ?? [],
          };
          return;
        }
        const msg = err.error?.message || 'No se pudo actualizar el insumo.';
        this.abrirModal('error', msg.includes('ya existe') ? 'Nombre duplicado' : 'Error', msg);
      },
    });
  }

  cerrarModalCambioUnidadIngrediente() {
    this.modalCambioUnidadIngrediente = { visible: false, productos: [] };
  }

  confirmarGuardarTrasCambioUnidad() {
    this.cerrarModalCambioUnidadIngrediente();
    this.guardarEdicionIngrediente(true);
  }

  abrirEditarProducto(prod: any, ev?: Event) {
    ev?.stopPropagation();
    this.cargando = true;
    this.http.get<any>(`${this.apiCatalogo}/productos/${prod.id}/edicion`).subscribe({
      next: (r) => {
        this.cargando = false;
        const p = r.producto;
        this.editandoProductoId = p.id;
        this.edicionProductoRestringida = r.edicionRestringidaPorOrden === true;
        this.editProducto = {
          name: p.name ?? '',
          price: p.price ?? 0.1,
          category: p.category ?? 'Entrada',
          description: p.description ?? '',
          imagesBase64: [...(p.imagesBase64 || [])],
        };
        this.editProductoPrecioText = Number(p.price ?? 0.1).toFixed(2);
        this.editRecetaActual = (r.receta || []).map((line: any) => ({
          ingredientId: line.ingredientId,
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
        }));
        this.editIngredienteSeleccionadoId = '';
        this.editCantidadRecetaText = '1';
        this.editBusquedaReceta = '';
        this.editFiltroCategoriaReceta = 'ALL';
        this.modalEditarProducto = { visible: true };
      },
      error: () => {
        this.cargando = false;
        this.abrirModal('error', 'Error', 'No se pudo cargar el producto para editar.');
      },
    });
  }

  cerrarModalEditarProducto() {
    this.modalEditarProducto = { visible: false };
    this.editandoProductoId = null;
    this.edicionProductoRestringida = false;
  }

  onEditMultipleFilesProducto(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const error = this.errorArchivoImagen(file);
      if (error) {
        this.abrirModal('error', 'Archivo inválido', error);
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.editProducto.imagesBase64.push(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagenProductoEdit(index: number) {
    this.editProducto.imagesBase64.splice(index, 1);
  }

  seleccionarInsumoParaRecetaEdit(id: number) {
    this.editIngredienteSeleccionadoId = id;
  }

  agregarInsumoARecetaEdit() {
    if (this.edicionProductoRestringida) return;
    if (!this.editIngredienteSeleccionadoId) {
      this.abrirModal('error', 'Insumo', 'Selecciona un insumo de la lista.');
      return;
    }
    const insumo = this.ingredientes.find((i) => i.id == this.editIngredienteSeleccionadoId);
    if (!insumo) return;

    const unit = insumo.unit as string;
    const maxDec = unit === 'UNIDADES' ? 0 : 2;
    const qty = this.parseNumeroFlexible(this.editCantidadRecetaText, {
      maxDecimals: maxDec,
      integerOnly: unit === 'UNIDADES',
      min: 0,
    });
    if (qty === null || qty <= 0) {
      return this.abrirModal(
        'error',
        'Cantidad inválida',
        unit === 'UNIDADES'
          ? 'Cantidad: número entero positivo, sin decimales.'
          : 'Cantidad: número positivo, máximo dos decimales.',
      );
    }

    const index = this.editRecetaActual.findIndex((r) => r.ingredientId === insumo.id);
    if (index >= 0) {
      this.editRecetaActual[index].quantity += qty;
    } else {
      this.editRecetaActual.push({
        ingredientId: insumo.id,
        name: insumo.name,
        quantity: qty,
        unit: insumo.unit,
      });
    }
    this.editCantidadRecetaText = '1';
    this.editIngredienteSeleccionadoId = '';
  }

  quitarInsumoEdit(index: number) {
    if (this.edicionProductoRestringida) return;
    this.editRecetaActual.splice(index, 1);
  }

  guardarEdicionProducto() {
    if (!this.editandoProductoId) return;

    if (this.edicionProductoRestringida) {
      if (!this.editProducto.imagesBase64?.length) {
        return this.abrirModal(
          'error',
          'Imágenes',
          'Debe existir al menos una imagen del producto.',
        );
      }
      this.cargando = true;
      this.http
        .put(`${this.apiCatalogo}/productos/${this.editandoProductoId}`, {
          producto: {
            description: this.editProducto.description ?? '',
            imagesBase64: this.editProducto.imagesBase64,
          },
          receta: [],
        })
        .subscribe({
          next: () => {
            this.cargando = false;
            this.cerrarModalEditarProducto();
            this.abrirModal('exito', 'Guardado', 'Producto actualizado (descripción e imágenes).');
            this.cargarDatos();
          },
          error: (err) => {
            this.cargando = false;
            this.abrirModal('error', 'Error', err.error?.message || 'No se pudo guardar.');
          },
        });
      return;
    }

    if (!this.editProducto.name?.trim()) {
      return this.abrirModal('error', 'Datos inválidos', 'Indica el nombre del producto.');
    }
    const precio = this.parseNumeroFlexible(this.editProductoPrecioText, {
      maxDecimals: 2,
      integerOnly: false,
      min: 0.1,
    });
    if (precio === null) {
      return this.abrirModal(
        'error',
        'Precio inválido',
        'Precio de venta: mínimo 0.10, máximo dos decimales.',
      );
    }
    this.editProducto.price = precio;

    if (this.editRecetaActual.length === 0) {
      return this.abrirModal('error', 'Receta', 'La receta debe incluir al menos un insumo.');
    }
    if (!this.editProducto.imagesBase64?.length) {
      return this.abrirModal('error', 'Imágenes', 'Debes incluir al menos una imagen.');
    }

    const payload = {
      producto: this.editProducto,
      receta: this.editRecetaActual.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
      })),
    };

    this.cargando = true;
    this.http.put(`${this.apiCatalogo}/productos/${this.editandoProductoId}`, payload).subscribe({
      next: () => {
        this.cargando = false;
        this.cerrarModalEditarProducto();
        this.abrirModal('exito', 'Guardado', 'Producto y receta actualizados.');
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || 'No se pudo guardar el producto.';
        this.abrirModal('error', msg.includes('ya existe') ? 'Nombre duplicado' : 'Error', msg);
      },
    });
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .normalize('NFD') // Descompone caracteres acentuados (ej: 'á' -> 'a' + '´')
      .replace(/[\u0300-\u036f]/g, '') // Elimina los signos de acentuación
      .toLowerCase();
  }

  get insumosFiltradosReceta(): any[] {
    const q = this.normalizarTexto(this.busquedaReceta);
    return this.ingredientes.filter((i) => {
      if (this.filtroCategoriaReceta !== 'ALL' && i.category !== this.filtroCategoriaReceta)
        return false;
      if (!q) return true;
      return this.normalizarTexto(i.name).includes(q);
    });
  }

  get insumosFiltradosAlmacen(): any[] {
    const q = this.normalizarTexto(this.busquedaAlmacen);
    return this.ingredientes.filter((i) => {
      if (this.filtroCategoriaAlmacen !== 'ALL' && i.category !== this.filtroCategoriaAlmacen)
        return false;
      if (!q) return true;
      return this.normalizarTexto(i.name).includes(q);
    });
  }

  get productosFiltradosCatalogo(): any[] {
    const q = this.normalizarTexto(this.busquedaCatalogo);
    return this.productos.filter((p) => {
      if (this.filtroCategoriaCatalogo !== 'ALL' && p.category !== this.filtroCategoriaCatalogo)
        return false;
      if (!q) return true;
      return this.normalizarTexto(p.name).includes(q);
    });
  }

  get nombreInsumoSeleccionadoAlmacen(): string {
    if (!this.ingredienteSeleccionadoAlmacenId) return '';
    const i = this.ingredientes.find((x) => x.id == this.ingredienteSeleccionadoAlmacenId);
    return (i?.name as string) || '';
  }

  seleccionarInsumoAlmacen(id: number) {
    this.ingredienteSeleccionadoAlmacenId = id;
  }

  imgIconoIngrediente(cat: string | undefined): string {
    const c = (cat || '').trim();
    return this.categoriasIngrediente.find((x) => x.value === c)?.img ?? 'heroMagnifyingGlass';
  }

  imgIconoProducto(cat: string | undefined): string {
    const c = (cat || '').trim();
    return this.categoriasProducto.find((x) => x.value === c)?.img ?? 'heroMagnifyingGlass';
  }

  get unidadAbastecerModal(): string {
    return (this.modalAbastecer.insumo?.unit as string) || 'UNIDADES';
  }

  abrirModalAbastecer() {
    if (!this.ingredienteSeleccionadoAlmacenId) {
      this.abrirModal('error', 'Selección', 'Selecciona un insumo de la lista.');
      return;
    }
    const insumo = this.ingredientes.find((i) => i.id == this.ingredienteSeleccionadoAlmacenId);
    if (!insumo) return;
    this.modalAbastecer = { visible: true, insumo };
    this.abastecerCantidadText = '1';
    this.abastecerCostoText = '';
    this.abastecerRazonText = '';
  }

  cerrarModalAbastecer() {
    this.modalAbastecer = { visible: false, insumo: null };
  }

  confirmarAbastecer() {
    const ins = this.modalAbastecer.insumo;
    if (!ins?.id) return;

    const unit = ins.unit as string;
    const maxDec = unit === 'UNIDADES' ? 0 : 2;
    const qty = this.parseNumeroFlexible(this.abastecerCantidadText, {
      maxDecimals: maxDec,
      integerOnly: unit === 'UNIDADES',
    });
    if (qty === null || qty <= 0) {
      return this.abrirModal(
        'error',
        'Cantidad inválida',
        unit === 'UNIDADES'
          ? 'Indica un entero mayor que cero, sin decimales.'
          : 'Indica un valor mayor que cero, máximo dos decimales.',
      );
    }

    let unitCost: number | null = null;
    const ct = (this.abastecerCostoText || '').trim();
    if (ct) {
      const c = this.parseNumeroFlexible(ct, {
        maxDecimals: 3,
        integerOnly: false,
        min: 0,
      });
      if (c === null) {
        return this.abrirModal(
          'error',
          'Costo inválido',
          'Costo unitario opcional: no negativo, máximo tres decimales.',
        );
      }
      unitCost = c;
    }

    let reason: string | null = this.abastecerRazonText.trim();
    if (reason.length > 255) reason = reason.slice(0, 255);
    if (!reason) reason = null;

    this.cargando = true;
    const payload: { quantity: number; unitCost?: number | null; reason?: string | null } = {
      quantity: qty,
      reason,
    };
    if (unitCost !== null) payload.unitCost = unitCost;

    this.http.post(`${this.apiCatalogo}/ingredientes/${ins.id}/abastecer`, payload).subscribe({
      next: () => {
        this.cargando = false;
        this.cerrarModalAbastecer();
        this.abrirModal('exito', 'Abastecimiento', 'Stock actualizado correctamente.');
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || 'No se pudo registrar el abastecimiento.';
        this.abrirModal('error', 'Error', msg);
      },
    });
  }

  get unidadInsumoSeleccionado(): string {
    if (!this.ingredienteSeleccionadoId) return 'UNIDADES';
    const i = this.ingredientes.find((x) => x.id == this.ingredienteSeleccionadoId);
    return (i?.unit as string) || 'UNIDADES';
  }

  seleccionarInsumoParaReceta(id: number) {
    this.ingredienteSeleccionadoId = id;
  }

  bloquearNoEuler(event: KeyboardEvent, permitirDecimal: boolean) {
    const k = event.key;
    if (k === 'e' || k === 'E' || k === '+') {
      event.preventDefault();
      return;
    }
    if (k === '-' || k === '−') {
      event.preventDefault();
      return;
    }
    if (!permitirDecimal && (k === '.' || k === ',')) {
      event.preventDefault();
    }
  }

  onSingleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const error = this.errorArchivoImagen(file);
      if (error) {
        this.abrirModal('error', 'Archivo inválido', error);
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => (this.nuevoIngrediente.imageBase64 = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onMultipleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      for (const file of Array.from(files)) {
        const error = this.errorArchivoImagen(file);
        if (error) {
          this.abrirModal('error', 'Archivo inválido', error);
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          this.nuevoProducto.imagesBase64.push(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  errorArchivoImagen(file: File): string | null {
    if (file.size > this.maxBytesImagen) {
      return 'La imagen no debe pesar más de 5MB.';
    }
    if (!this.tiposImagenPermitidos.includes(file.type)) {
      return 'Solo se permite formato PNG o JPG.';
    }
    return null;
  }

  eliminarImagenProducto(index: number) {
    this.nuevoProducto.imagesBase64.splice(index, 1);
  }

  private sinDecimalesTexto(s: string): string {
    const n = this.parseNumeroFlexible(s, { maxDecimals: 0, integerOnly: true });
    if (n === null) return '0';
    return String(Math.round(n));
  }

  private parseNumeroFlexible(
    raw: string,
    opts: { maxDecimals: number; integerOnly: boolean; min?: number },
  ): number | null {
    const t = (raw ?? '').trim().replace(',', '.');
    if (t === '' || /[eE]/.test(t)) return null;
    if (!/^\d*\.?\d*$/.test(t)) return null;
    const n = Number(t);
    if (Number.isNaN(n) || n < 0) return null;
    if (opts.integerOnly && Math.abs(n - Math.round(n)) > 1e-9) return null;
    const factor = Math.pow(10, opts.maxDecimals);
    const scaled = Math.round(n * factor);
    if (Math.abs(n * factor - scaled) > 1e-6) return null;
    const rounded = scaled / factor;
    if (opts.min !== undefined && n + 1e-9 < opts.min) return null;
    return rounded;
  }

  guardarIngrediente() {
    if (!this.nuevoIngrediente.name?.trim()) {
      return this.abrirModal('error', 'Datos Inválidos', 'El ingrediente necesita nombre.');
    }
    const foto = (this.nuevoIngrediente.imageBase64 || '').trim();
    if (!foto) {
      return this.abrirModal(
        'error',
        'Foto obligatoria',
        'Debes subir una foto del insumo para registrarlo en almacén.',
      );
    }

    const unit = this.nuevoIngrediente.unit;
    const maxDec = unit === 'UNIDADES' ? 0 : 2;
    const stock = this.parseNumeroFlexible(this.ingredienteStockText, {
      maxDecimals: maxDec,
      integerOnly: unit === 'UNIDADES',
    });
    if (stock === null) {
      return this.abrirModal(
        'error',
        'Stock inválido',
        unit === 'UNIDADES'
          ? 'Stock inicial: solo números enteros positivos o cero, sin decimales.'
          : 'Stock inicial: números positivos o cero, máximo dos decimales.',
      );
    }

    const costo = this.parseNumeroFlexible(this.ingredienteCostoText, {
      maxDecimals: 3,
      integerOnly: false,
      min: 0,
    });
    if (costo === null) {
      return this.abrirModal(
        'error',
        'Costo inválido',
        'Costo unitario: no negativo, máximo tres decimales, sin notación científica.',
      );
    }

    this.nuevoIngrediente.stockQuantity = stock;
    this.nuevoIngrediente.price = costo;

    this.cargando = true;
    this.http.post(`${this.apiCatalogo}/ingredientes`, this.nuevoIngrediente).subscribe({
      next: () => {
        this.cargando = false;
        this.abrirModal('exito', 'Guardado', 'Ingrediente registrado en el inventario.');
        this.nuevoIngrediente = {
          name: '',
          unit: 'UNIDADES',
          stockQuantity: 0,
          category: 'Verduras',
          price: 0,
          imageBase64: '',
        };
        this.ingredienteStockText = '0';
        this.ingredienteCostoText = '0';
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || 'No se pudo guardar el ingrediente.';
        this.abrirModal('error', msg.includes('ya existe') ? 'Insumo duplicado' : 'Error', msg);
      },
    });
  }

  agregarInsumoAReceta() {
    if (!this.ingredienteSeleccionadoId) {
      this.abrirModal('error', 'Insumo', 'Selecciona un insumo de la lista o búsqueda.');
      return;
    }

    const insumo = this.ingredientes.find((i) => i.id == this.ingredienteSeleccionadoId);
    if (!insumo) return;

    const unit = insumo.unit as string;
    const maxDec = unit === 'UNIDADES' ? 0 : 2;
    const qty = this.parseNumeroFlexible(this.cantidadRecetaText, {
      maxDecimals: maxDec,
      integerOnly: unit === 'UNIDADES',
      min: 0,
    });
    if (qty === null || qty <= 0) {
      return this.abrirModal(
        'error',
        'Cantidad inválida',
        unit === 'UNIDADES'
          ? 'Cantidad: número entero positivo, sin decimales.'
          : 'Cantidad: número positivo, máximo dos decimales.',
      );
    }

    const index = this.recetaActual.findIndex((r) => r.ingredientId === insumo.id);
    if (index >= 0) {
      this.recetaActual[index].quantity += qty;
    } else {
      this.recetaActual.push({
        ingredientId: insumo.id,
        name: insumo.name,
        quantity: qty,
        unit: insumo.unit,
      });
    }
    this.cantidadRecetaText = '1';
    this.ingredienteSeleccionadoId = '';
  }

  quitarInsumo(index: number) {
    this.recetaActual.splice(index, 1);
  }

  guardarProducto() {
    if (!this.nuevoProducto.name?.trim()) {
      return this.abrirModal('error', 'Datos Inválidos', 'Revisa el nombre del producto.');
    }

    const precio = this.parseNumeroFlexible(this.productoPrecioText, {
      maxDecimals: 2,
      integerOnly: false,
      min: 0.1,
    });
    if (precio === null) {
      return this.abrirModal(
        'error',
        'Precio inválido',
        'Precio de venta: mínimo 0.10, máximo dos decimales, sin notación científica.',
      );
    }
    this.nuevoProducto.price = precio;

    if (this.recetaActual.length === 0) {
      return this.abrirModal(
        'error',
        'Receta Vacía',
        'Un producto debe tener al menos un ingrediente para descontar del inventario.',
      );
    }
    if (this.nuevoProducto.imagesBase64.length === 0) {
      return this.abrirModal('error', 'Falta Imagen', 'Debes subir al menos una foto del plato.');
    }

    this.cargando = true;
    const payload = {
      producto: this.nuevoProducto,
      receta: this.recetaActual,
    };

    this.http.post(`${this.apiCatalogo}/productos`, payload).subscribe({
      next: () => {
        this.cargando = false;
        this.abrirModal(
          'exito',
          'Producto creado',
          'Producto guardado en el catálogo y receta vinculada.',
        );
        this.nuevoProducto = {
          name: '',
          price: 0.1,
          category: 'Entrada',
          description: '',
          imagesBase64: [],
        };
        this.productoPrecioText = '0.10';
        this.recetaActual = [];
        this.busquedaReceta = '';
        this.filtroCategoriaReceta = 'ALL';
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || 'No se pudo guardar el producto.';
        this.abrirModal('error', msg.includes('ya existe') ? 'Receta duplicada' : 'Error', msg);
      },
    });
  }

  solicitarEliminarProducto(idMongo: string) {
    this.cargando = true;
    this.http.get<any>(`${this.apiCatalogo}/productos/${idMongo}/eliminar-precheck`).subscribe({
      next: (r) => {
        this.cargando = false;
        if (!r?.allowed) {
          this.modalOrdenBloqueo = {
            visible: true,
            mensaje:
              r?.message ||
              'No es posible eliminar este producto porque aún está en proceso de ser entregado.',
          };
          return;
        }
        this.modalConfirmarProducto = { visible: true, productoId: idMongo };
      },
      error: () => {
        this.cargando = false;
        this.abrirModal('error', 'Error', 'No se pudo validar la eliminación del producto.');
      },
    });
  }

  cerrarModalConfirmarProducto() {
    this.modalConfirmarProducto = { visible: false, productoId: '' };
  }

  ejecutarEliminarProducto() {
    const id = this.modalConfirmarProducto.productoId;
    if (!id) return;
    this.cerrarModalConfirmarProducto();
    this.cargando = true;
    this.http.delete(`${this.apiCatalogo}/productos/${id}`).subscribe({
      next: () => {
        this.cargando = false;
        this.abrirModal(
          'exito',
          'Producto eliminado',
          'El producto ya no aparecerá en el menú ni en la gestión de cocina.',
        );
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message;
        if (err.status === 409 && msg) {
          this.modalOrdenBloqueo = { visible: true, mensaje: msg };
        } else {
          this.abrirModal('error', 'Error', msg || 'No se pudo eliminar el producto.');
        }
      },
    });
  }

  solicitarEliminarIngrediente(id: number, ev?: Event) {
    ev?.stopPropagation();
    this.cargando = true;
    this.http.get<any>(`${this.apiCatalogo}/ingredientes/${id}/eliminar-precheck`).subscribe({
      next: (r) => {
        this.cargando = false;
        if (!r?.allowed) {
          this.modalOrdenBloqueo = {
            visible: true,
            mensaje:
              r?.message ||
              'No es posible eliminar este insumo porque hay pedidos pendientes vinculados.',
          };
          return;
        }
        if (r.requiereAdvertenciaRecetas) {
          this.modalAdvertenciaIngrediente = {
            visible: true,
            insumoId: id,
            productos: (r.productosAfectados as string[]) ?? [],
          };
          return;
        }
        this.modalConfirmarIngrediente = { visible: true, insumoId: id };
      },
      error: () => {
        this.cargando = false;
        this.abrirModal('error', 'Error', 'No se pudo validar la eliminación del insumo.');
      },
    });
  }

  cerrarModalAdvertenciaIngrediente() {
    this.modalAdvertenciaIngrediente = { visible: false, insumoId: 0, productos: [] };
  }

  ejecutarEliminarTrasAdvertenciaIngrediente() {
    const id = this.modalAdvertenciaIngrediente.insumoId;
    this.cerrarModalAdvertenciaIngrediente();
    this.ejecutarEliminarIngredienteApi(id);
  }

  cerrarModalConfirmarIngrediente() {
    this.modalConfirmarIngrediente = { visible: false, insumoId: 0 };
  }

  ejecutarEliminarIngredienteSimple() {
    const id = this.modalConfirmarIngrediente.insumoId;
    this.cerrarModalConfirmarIngrediente();
    this.ejecutarEliminarIngredienteApi(id);
  }

  private ejecutarEliminarIngredienteApi(id: number) {
    if (!id) return;
    this.cargando = true;
    this.http.delete(`${this.apiCatalogo}/ingredientes/${id}`).subscribe({
      next: () => {
        this.cargando = false;
        this.abrirModal(
          'exito',
          'Insumo eliminado',
          'El insumo ya no aparecerá en almacén ni en recetas.',
        );
        if (this.ingredienteSeleccionadoAlmacenId === id) {
          this.ingredienteSeleccionadoAlmacenId = '';
        }
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message;
        if (err.status === 409 && msg) {
          this.modalOrdenBloqueo = { visible: true, mensaje: msg };
        } else {
          this.abrirModal('error', 'Error', msg || 'No se pudo eliminar el insumo.');
        }
      },
    });
  }

  cerrarModalOrdenBloqueo() {
    this.modalOrdenBloqueo = { visible: false, mensaje: '' };
  }

  abrirModal(tipo: string, titulo: string, mensaje: string) {
    this.modal = { visible: true, tipo, titulo, mensaje };
  }
  cerrarModal() {
    this.modal.visible = false;
  }

  filtrarDecimalPositivo(event: Event, maxDecimals: number): string {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    val = val.replace(',', '.');

    if (maxDecimals === 0) {
      val = val.replace(/\D/g, '');
    } else {
      val = val.replace(/[^0-9.]/g, '');

      const parts = val.split('.');
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
      }

      if (val.includes('.')) {
        const split = val.split('.');
        val = split[0] + '.' + split[1].substring(0, maxDecimals);
      }
    }

    input.value = val;
    return val;
  }
}
