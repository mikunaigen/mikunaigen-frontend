export const COLUMNAS_CSV_MINSA = [
  'codigo',
  'grupo',
  'nombre_alimento',
  'energia_kcal',
  'agua_g',
  'proteinas_g',
  'grasa_total_g',
  'carbohidratos_totales_g',
  'carbohidratos_disponibles_g',
  'fibra_dietaria_g',
  'cenizas_g',
  'calcio_mg',
  'fosforo_mg',
  'zinc_mg',
  'hierro_mg',
  'beta_caroteno_ug',
  'vitamina_a_ug',
  'tiamina_mg',
  'riboflavina_mg',
  'niacina_mg',
  'vitamina_c_mg',
  'acido_folico_ug',
  'sodio_mg',
  'potasio_mg',
  'costo_kg_soles',
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export function leerArchivoCsvComoTexto(file: File): Promise<string> {
  return file.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    let start = 0;
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      start = 3;
    }
    const slice = bytes.subarray(start);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(slice);
    } catch {
      return new TextDecoder('iso-8859-1').decode(slice);
    }
  });
}

export function extraerLineasDatosCsv(texto: string): string[] {
  const lineas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lineas.length === 0) {
    throw new Error('El archivo CSV está vacío.');
  }
  const headerLine = lineas[0];
  validarCabeceraCsv(headerLine);
  const datos: string[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea.trim()) {
      continue;
    }
    datos.push(linea);
  }
  return datos;
}

function normalizarNombreColumna(columna: string): string {
  return columna.replace(/\uFEFF/g, '').replace(/\r/g, '').trim().toLowerCase();
}

function parsearLineaCsv(linea: string): string[] {
  const saneada = linea.replace(/\r/g, '');
  const partes: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < saneada.length; i++) {
    const c = saneada.charAt(i);
    if (c === '"') {
      if (entreComillas && i + 1 < saneada.length && saneada.charAt(i + 1) === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === ',' && !entreComillas) {
      partes.push(limpiarCeldaCsv(actual));
      actual = '';
    } else {
      actual += c;
    }
  }
  partes.push(limpiarCeldaCsv(actual));
  return partes;
}

function limpiarCeldaCsv(valor: string): string {
  let v = valor.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\uFEFF/g, '');
}

function validarCabeceraCsv(headerLine: string): void {
  const limpia = headerLine.replace(/\uFEFF/g, '').replace(/\r/g, '').trim();
  const headers = parsearLineaCsv(limpia);
  const normalizados = headers.map(normalizarNombreColumna);
  const esperados = COLUMNAS_CSV_MINSA.map((c) => c.toLowerCase());
  if (normalizados.length !== esperados.length) {
    throw new Error('Las columnas del CSV no coinciden con el formato MINSA.');
  }
  for (let i = 0; i < esperados.length; i++) {
    if (normalizados[i] !== esperados[i]) {
      throw new Error(
        `Columna ${i + 1} incorrecta. Se esperaba "${COLUMNAS_CSV_MINSA[i]}", se encontró "${headers[i].trim()}".`,
      );
    }
  }
}
