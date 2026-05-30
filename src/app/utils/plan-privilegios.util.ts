import { obtenerPlanDetalle } from '../data/plan-detalles';

export type CodigoPlanRequerido = 'emprendedor' | 'nutricionista';

export function mensajePlanRequerido(codigo?: string | null): string {
  if (!codigo) {
    return 'Disponible en un plan superior';
  }
  const det = obtenerPlanDetalle(codigo);
  return `Disponible en Plan ${det.nombre}`;
}

export function etiquetaPlanRequerido(codigo?: string | null): string {
  if (!codigo) {
    return 'Plan superior';
  }
  return obtenerPlanDetalle(codigo).nombre;
}

export function scrollACambiarPlan(): void {
  const el = document.getElementById('cambiar-plan');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
