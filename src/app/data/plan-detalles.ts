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
  subtitulo: 'Rol por defecto · Gratuito',
  precioEtiqueta: 'Gratuito',
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
      texto: 'Solo «Alta / Máxima Precisión Nutricional» (1 de las 3 cabezas del modelo).',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Sin presupuesto máximo ni costo estimado por kg en resultados e historial.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Sin filtro de estacionalidad (ingredientes de temporada).',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto: 'Análisis básico: colores y valor numérico, sin detalle normativo ni límites legales.',
    },
    {
      icon: 'heroLockClosed',
      titulo: 'Exportación',
      texto: 'Bloqueada. No puedes descargar fichas técnicas.',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial (Mis recetas)',
      texto: 'Hasta 2 recetas. Al guardar una tercera, se reemplaza la más antigua automáticamente.',
    },
  ],
};

const EMPRENDEDOR: PlanDetalle = {
  codigo: 'emprendedor',
  nombre: 'Emprendedor',
  subtitulo: 'Enfoque en negocio y costos de producción',
  precioEtiqueta: 'S/ 20.00',
  precioNota: 'Mensual · válido 30 días calendario.',
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
      texto: 'Hasta 2 de 3 cabezas: Precisión Nutricional, Mínimo Costo y Máxima Biodiversidad.',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Define presupuesto máximo por kg y visualiza el costo estimado en recetas e historial.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Filtro de estacionalidad habilitado según el mes.',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto: 'Análisis básico: colores y valores, sin desglose legal específico.',
    },
    {
      icon: 'heroArrowDownTray',
      titulo: 'Exportación',
      texto: 'Ficha técnica en Excel (.xlsx).',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial (Mis recetas)',
      texto: 'Hasta 50 recetas. Al llegar al límite, eliges manualmente cuál reemplazar.',
    },
  ],
};

const NUTRICIONISTA: PlanDetalle = {
  codigo: 'nutricionista',
  nombre: 'Nutricionista',
  subtitulo: 'Premium · Análisis legal y normativo completo',
  precioEtiqueta: 'S/ 50.00',
  precioNota: 'Mensual · válido 30 días calendario.',
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
      texto: 'Las 3 cabezas a la vez (Precisión, Costo y Biodiversidad) con más alternativas.',
    },
    {
      icon: 'heroBanknotes',
      titulo: 'Presupuesto y costos',
      texto: 'Funcionalidad completa: presupuestos y visualización de costos.',
    },
    {
      icon: 'heroCalendar',
      titulo: 'Ingredientes',
      texto: 'Filtro de estacionalidad y restricciones completas.',
    },
    {
      icon: 'heroSignal',
      titulo: 'Semáforo normativo',
      texto:
        'Análisis extendido: límite permitido, referencia Codex Alimentarius y octógonos según Ley N° 30021.',
    },
    {
      icon: 'heroArrowDownTray',
      titulo: 'Exportación',
      texto: 'Ficha técnica en Excel (.xlsx) o PDF (.pdf).',
    },
    {
      icon: 'heroQueueList',
      titulo: 'Historial (Mis recetas)',
      texto: 'Hasta 100 recetas. Reemplazo manual al llegar al tope.',
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
