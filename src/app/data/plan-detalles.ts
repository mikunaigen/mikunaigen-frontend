export type PlanCaracteristica = {
  icon: string;
  titulo: string;
  texto: string;
};

export type PlanDetalle = {
  codigo: string;
  nombre: string;
  subtitulo: string;
  precioEtiqueta: string;
  precioNota?: string;
  iconoPrincipal: string;
  caracteristicas: PlanCaracteristica[];
};

const ESTUDIANTE: PlanDetalle = {
  codigo: 'estudiante',
  nombre: 'Estudiante',
  subtitulo: 'Plan Gratuito',
  precioEtiqueta: 'S/0.00',
  precioNota: 'Se asigna al registrarte o si no renuevas un plan de pago.',
  iconoPrincipal: 'heroAcademicCap',
  caracteristicas: [
    {
      icon: 'heroBolt',
      titulo: 'Inferencias',
      texto: 'Máximo 2 inferencias por mes para generar recetas.',
    },
    {
      icon: 'heroAdjustmentsHorizontal',
      titulo: 'Optimización',
      texto: 'Solo 1 de los 3 modos de optimización del modelo.',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Sin presupuesto máximo ni costo estimado por kg en resultados e historial.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Sin filtro de estacionalidad por mes.',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto: 'Análisis básico de colores y valor numérico sin detalle normativo.',
    },
    {
      icon: 'heroLockClosed',
      titulo: 'Exportación',
      texto: 'Bloqueado. No puedes descargar fichas técnicas.',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial de Recetas',
      texto: 'Hasta 2 recetas. Al guardar una adicional se reemplaza las anteriores.',
    },
  ],
};

const EMPRENDEDOR: PlanDetalle = {
  codigo: 'emprendedor',
  nombre: 'Emprendedor',
  subtitulo: 'Enfoque en negocio y costos',
  precioEtiqueta: 'S/ 20.00',
  precioNota: 'Mensual válido 30 días calendarios.',
  iconoPrincipal: 'heroBriefcase',
  caracteristicas: [
    {
      icon: 'heroBolt',
      titulo: 'Inferencias',
      texto: 'Máximo 20 inferencias por mes.',
    },
    {
      icon: 'heroAdjustmentsHorizontal',
      titulo: 'Optimización',
      texto: 'Hasta 2 de 3 modelos de optimización entre Precisión Nutricional, Mínimo Costo y Máxima Biodiversidad.',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Define presupuesto máximo por kg y visualiza el resultado estimado en recetas e historial.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Filtro de estacionalidad habilitado según el mes.',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto: 'Análisis básico colores y valores sin desglose legal.',
    },
    {
      icon: 'heroArrowDownTray',
      titulo: 'Exportación',
      texto: 'Ficha técnica en Excel.',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial de Recetas',
      texto: 'Hasta 50 recetas. Al llegar al límite, eliges cuál reemplazar.',
    },
  ],
};

const NUTRICIONISTA: PlanDetalle = {
  codigo: 'nutricionista',
  nombre: 'Nutricionista',
  subtitulo: 'Premium · Análisis legal y normativo completo',
  precioEtiqueta: 'S/ 50.00',
  precioNota: 'Mensual válido 30 días calendarios.',
  iconoPrincipal: 'heroShieldCheck',
  caracteristicas: [
    {
      icon: 'heroBolt',
      titulo: 'Inferencias',
      texto: 'Máximo 50 inferencias por mes.',
    },
    {
      icon: 'heroAdjustmentsHorizontal',
      titulo: 'Optimización',
      texto: 'Los 3 modos de optimización a la vez con más alternativas.',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Funcionalidad completa de presupuestos y visualización de costos.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Filtro de estacionalidad y restricciones.',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto:
        'Análisis extendido de límite permitido, referencia Codex Alimentarius y octógonos según Ley N° 30021.',
    },
    {
      icon: 'heroArrowDownTray',
      titulo: 'Exportación',
      texto: 'Ficha técnica en Excel y PDF',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial de Recetas',
      texto: 'Hasta 100 recetas. Al llegar al límite, eliges cuál reemplazar.',
    },
  ],
};

const POR_CODIGO: Record<string, PlanDetalle> = {
  estudiante: ESTUDIANTE,
  cliente: ESTUDIANTE,
  emprendedor: EMPRENDEDOR,
  nutricionista: NUTRICIONISTA,
};

export function normalizarCodigoPlan(rol?: string): string {
  const r = (rol || '').trim().toLowerCase();
  if (r === 'cliente') {
    return 'estudiante';
  }
  return r;
}

export function obtenerPlanDetalle(codigo?: string): PlanDetalle {
  const key = normalizarCodigoPlan(codigo);
  return POR_CODIGO[key] ?? ESTUDIANTE;
}

export function precioMostrarPlan(detalle: PlanDetalle, precioFormateado?: string): string {
  if (precioFormateado && detalle.codigo !== 'estudiante') {
    return precioFormateado;
  }
  return detalle.precioEtiqueta;
}
