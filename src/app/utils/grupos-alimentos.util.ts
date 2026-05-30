const NOMBRES_GRUPO: Record<string, string> = {
  A: 'Cereales',
  B: 'Verduras',
  C: 'Frutas',
  D: 'Grasas',
  E: 'Pescados',
  F: 'Carnes',
  G: 'Leche',
  H: 'Bebidas',
  J: 'Huevos',
  K: 'Azucarados',
  S: 'Preparados',
  T: 'Leguminosas',
  U: 'Tubérculos',
};

export function nombreGrupoAlimento(categoria?: string | null): string {
  if (!categoria) {
    return '—';
  }
  const codigo = categoria.trim().toUpperCase();
  return NOMBRES_GRUPO[codigo] ?? categoria;
}
