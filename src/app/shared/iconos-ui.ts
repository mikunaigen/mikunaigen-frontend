export type IconoModalTipo = 'ok' | 'error' | 'warn' | 'info' | 'confirm';

export function iconoModal(tipo: IconoModalTipo): string {
  if (tipo === 'ok') return 'heroCheckCircle';
  if (tipo === 'error' || tipo === 'confirm') return 'heroXCircle';
  if (tipo === 'warn') return 'heroExclamationTriangle';
  return 'heroInformationCircle';
}

export function iconoEstadoRespaldo(t: string): string {
  if (t === 'Exitoso') return 'heroCheckCircle';
  if (t === 'Fallido' || t === 'Cancelado') return 'heroXCircle';
  if (t === 'En proceso') return 'heroInformationCircle';
  return 'heroExclamationTriangle';
}

/** Grupos alimentarios MINSA (alineados con AdminAlimentoDatasetService.CATEGORIAS). */
export const GRUPOS_ALIMENTO_MINSA = [
  'Cereales',
  'Verduras',
  'Frutas',
  'Grasas',
  'Pescados',
  'Carnes',
  'Leche',
  'Bebidas',
  'Huevos',
  'Azucarados',
  'Preparados',
  'Leguminosas',
  'Tubérculos',
] as const;

export const ICONO_CATEGORIA_PRODUCTO: Record<string, string> = {
  Cereales: 'heroQueueList',
  Verduras: 'heroSparkles',
  Frutas: 'heroSparkles',
  Grasas: 'heroFire',
  Pescados: 'heroBeaker',
  Carnes: 'heroFire',
  Leche: 'heroBeaker',
  Bebidas: 'heroBeaker',
  Huevos: 'heroCircleStack',
  Azucarados: 'heroCake',
  Preparados: 'heroQueueList',
  Leguminosas: 'heroCircleStack',
  'Tubérculos': 'heroCircleStack',
};

export const ICONO_CATEGORIA_INGREDIENTE: Record<string, string> = {
  Verduras: 'heroSparkles',
  Carnes: 'heroFire',
  Huevos: 'heroCircleStack',
  Marinos: 'heroBeaker',
  Abarrotes: 'heroArchiveBox',
  'Lácteos': 'heroBeaker',
  Bebidas: 'heroBeaker',
  Frutas: 'heroSparkles',
  'Panadería': 'heroCake',
};

export function iconoCategoriaProducto(categoria: string): string {
  return ICONO_CATEGORIA_PRODUCTO[categoria] ?? 'heroMagnifyingGlass';
}

export function iconoCategoriaIngrediente(categoria: string): string {
  return ICONO_CATEGORIA_INGREDIENTE[categoria] ?? 'heroMagnifyingGlass';
}

export const LOGO_MARCA = 'heroBeaker';
