import { CAMPOS_OBJETIVO_NUTRICIONAL } from '../data/objetivo-nutricional-campos';

export type TipoGraficoExpandido = 'composicion' | 'precision' | 'semaforo';

export function clavePerfilNutricional(key: string): string {
  if (key === 'fibra_g') {
    return 'fibra_dietaria_g';
  }
  return key;
}

export function etiquetaNutrienteFormulacion(key: string): string {
  const campo = CAMPOS_OBJETIVO_NUTRICIONAL.find((c) => c.key === key || clavePerfilNutricional(c.key) === key);
  if (campo) {
    return `${campo.label} (${campo.unidad})`;
  }
  return key
    .replace(/_mg|_g|_kcal|_ug/g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function claseDesviacionPorcentual(objetivo: number, logrado: number): string {
  const base = Math.abs(objetivo);
  if (base < 0.0001) {
    return logrado === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400';
  }
  const pct = (Math.abs(logrado - objetivo) / base) * 100;
  if (pct < 10) {
    return 'text-green-600 dark:text-green-400';
  }
  if (pct < 25) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-red-600 dark:text-red-400';
}

export function porcentajeDesviacion(objetivo: number, logrado: number): string {
  const base = Math.abs(objetivo);
  if (base < 0.0001) {
    return '—';
  }
  const pct = ((logrado - objetivo) / base) * 100;
  const signo = pct > 0 ? '+' : '';
  return `${signo}${pct.toFixed(1)}%`;
}

export function nutrientesPrecisionCompletos(
  perfil: Record<string, { objetivo: number; logrado: number; desviacion: number }> | undefined,
): string[] {
  const claves: string[] = [];
  for (const campo of CAMPOS_OBJETIVO_NUTRICIONAL) {
    const pk = clavePerfilNutricional(campo.key);
    const fila = perfil?.[pk] ?? perfil?.[campo.key];
    const obj = fila?.objetivo ?? 0;
    const log = fila?.logrado ?? 0;
    if (Math.abs(obj) > 0.0001 || Math.abs(log) > 0.0001) {
      claves.push(pk);
    }
  }
  return claves;
}

export function puedeDescargarGrafico(rol: string): boolean {
  return rol === 'emprendedor' || rol === 'nutricionista';
}

export function puedeVerCostoProduccion(rol: string): boolean {
  return rol === 'emprendedor' || rol === 'nutricionista';
}

export function esNutricionistaRol(rol: string): boolean {
  return rol === 'nutricionista';
}
