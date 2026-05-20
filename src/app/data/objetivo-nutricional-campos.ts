export type ObjetivoNutricionalValores = {
  energia_kcal: number | null;
  agua_g: number | null;
  proteinas_g: number | null;
  grasa_total_g: number | null;
  carbohidratos_disponibles_g: number | null;
  fibra_g: number | null;
  cenizas_g: number | null;
  calcio_mg: number | null;
  fosforo_mg: number | null;
  zinc_mg: number | null;
  hierro_mg: number | null;
  beta_caroteno_ug: number | null;
  vitamina_a_ug: number | null;
  tiamina_mg: number | null;
  riboflavina_mg: number | null;
  niacina_mg: number | null;
  vitamina_c_mg: number | null;
  acido_folico_ug: number | null;
  sodio_mg: number | null;
  potasio_mg: number | null;
  costo_kg_soles: number | null;
};

export type CampoObjetivoDef = {
  key: keyof ObjetivoNutricionalValores;
  label: string;
  unidad: string;
  tooltip: string;
  step?: string;
};

export const CAMPOS_OBJETIVO_NUTRICIONAL: CampoObjetivoDef[] = [
  {
    key: 'energia_kcal',
    label: 'Energía',
    unidad: 'kcal',
    tooltip: 'Aporte calórico total que debe aportar la receta por unidad de referencia.',
    step: '0.01',
  },
  {
    key: 'agua_g',
    label: 'Agua',
    unidad: 'g',
    tooltip: 'Contenido de humedad o agua presente en el alimento formulado.',
    step: '0.01',
  },
  {
    key: 'proteinas_g',
    label: 'Proteínas',
    unidad: 'g',
    tooltip: 'Cantidad de proteína que se busca alcanzar en la composición.',
    step: '0.01',
  },
  {
    key: 'grasa_total_g',
    label: 'Grasa total',
    unidad: 'g',
    tooltip: 'Grasas totales incluyendo saturadas e insaturadas.',
    step: '0.01',
  },
  {
    key: 'carbohidratos_disponibles_g',
    label: 'Carbohidratos disponibles',
    unidad: 'g',
    tooltip: 'Carbohidratos asimilables, excluyendo la fibra dietaria.',
    step: '0.01',
  },
  {
    key: 'fibra_g',
    label: 'Fibra dietaria',
    unidad: 'g',
    tooltip: 'Fibra que aporta saciedad y beneficio digestivo.',
    step: '0.01',
  },
  {
    key: 'cenizas_g',
    label: 'Cenizas',
    unidad: 'g',
    tooltip: 'Residuo mineral tras combustión; indicador de contenido mineral total.',
    step: '0.01',
  },
  {
    key: 'calcio_mg',
    label: 'Calcio',
    unidad: 'mg',
    tooltip: 'Mineral clave para huesos y dientes.',
    step: '0.01',
  },
  {
    key: 'fosforo_mg',
    label: 'Fósforo',
    unidad: 'mg',
    tooltip: 'Participa en metabolismo energético y estructura ósea.',
    step: '0.01',
  },
  {
    key: 'zinc_mg',
    label: 'Zinc',
    unidad: 'mg',
    tooltip: 'Apoya inmunidad y síntesis proteica.',
    step: '0.01',
  },
  {
    key: 'hierro_mg',
    label: 'Hierro',
    unidad: 'mg',
    tooltip: 'Esencial para transporte de oxígeno; relevante en prevención de anemia.',
    step: '0.01',
  },
  {
    key: 'beta_caroteno_ug',
    label: 'Beta-caroteno',
    unidad: 'µg',
    tooltip: 'Provitamina A con función antioxidante.',
    step: '0.01',
  },
  {
    key: 'vitamina_a_ug',
    label: 'Vitamina A',
    unidad: 'µg',
    tooltip: 'Importante para visión, piel y defensas.',
    step: '0.01',
  },
  {
    key: 'tiamina_mg',
    label: 'Tiamina',
    unidad: 'mg',
    tooltip: 'Vitamina B1; interviene en el metabolismo de carbohidratos.',
    step: '0.01',
  },
  {
    key: 'riboflavina_mg',
    label: 'Riboflavina',
    unidad: 'mg',
    tooltip: 'Vitamina B2; participa en producción de energía celular.',
    step: '0.01',
  },
  {
    key: 'niacina_mg',
    label: 'Niacina',
    unidad: 'mg',
    tooltip: 'Vitamina B3; apoya metabolismo y salud cardiovascular.',
    step: '0.01',
  },
  {
    key: 'vitamina_c_mg',
    label: 'Vitamina C',
    unidad: 'mg',
    tooltip: 'Antioxidante que favorece absorción de hierro y defensas.',
    step: '0.01',
  },
  {
    key: 'acido_folico_ug',
    label: 'Ácido fólico',
    unidad: 'µg',
    tooltip: 'Vitamina B9; clave en crecimiento y prevención de anemia megaloblástica.',
    step: '0.01',
  },
  {
    key: 'sodio_mg',
    label: 'Sodio',
    unidad: 'mg',
    tooltip: 'Electrolito; controlar su nivel ayuda en productos con perfil saludable.',
    step: '0.01',
  },
  {
    key: 'potasio_mg',
    label: 'Potasio',
    unidad: 'mg',
    tooltip: 'Electrolito que equilibra sodio y apoya función muscular.',
    step: '0.01',
  },
  {
    key: 'costo_kg_soles',
    label: 'Costo máximo por kg',
    unidad: 'S/',
    tooltip: 'Tope de costo por kilogramo de producto formulado en soles.',
    step: '0.01',
  },
];

export function objetivoVacio(): ObjetivoNutricionalValores {
  return {
    energia_kcal: null,
    agua_g: null,
    proteinas_g: null,
    grasa_total_g: null,
    carbohidratos_disponibles_g: null,
    fibra_g: null,
    cenizas_g: null,
    calcio_mg: null,
    fosforo_mg: null,
    zinc_mg: null,
    hierro_mg: null,
    beta_caroteno_ug: null,
    vitamina_a_ug: null,
    tiamina_mg: null,
    riboflavina_mg: null,
    niacina_mg: null,
    vitamina_c_mg: null,
    acido_folico_ug: null,
    sodio_mg: null,
    potasio_mg: null,
    costo_kg_soles: null,
  };
}
