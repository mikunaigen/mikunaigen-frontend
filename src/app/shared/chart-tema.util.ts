import { Chart, ChartOptions } from 'chart.js';

export function coloresChartOscuro(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function opcionesBaseChart(): ChartOptions {
  const oscuro = coloresChartOscuro();
  const texto = oscuro ? '#e2e8f0' : '#374151';
  const rejilla = oscuro ? 'rgba(148, 163, 184, 0.2)' : 'rgba(209, 213, 219, 0.8)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: texto, boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: oscuro ? '#1e293b' : '#ffffff',
        titleColor: texto,
        bodyColor: texto,
        borderColor: oscuro ? '#334155' : '#e5e7eb',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: texto, font: { size: 10 } },
        grid: { color: rejilla },
      },
      y: {
        ticks: { color: texto, font: { size: 10 } },
        grid: { color: rejilla },
      },
    },
  };
}

export function paletaIngredientes(): string[] {
  return ['#D48806', '#0056B3', '#28A745', '#A05CE5', '#E8855A', '#17A2B8', '#DC3545', '#F1C40F'];
}

export function destruirChart(instancia?: Chart | null): void {
  instancia?.destroy();
}

export function fondoExportacionJpeg(): string {
  return coloresChartOscuro() ? '#0f172a' : '#ffffff';
}

export function colorTextoExportacionJpeg(): string {
  return coloresChartOscuro() ? '#e2e8f0' : '#1f2937';
}

export type BloqueExportacionGrafico = {
  canvas: HTMLCanvasElement;
  titulo?: string;
};

export interface OpcionesCombinarCanvasesJpeg {
  fondo?: string;
  paddingPx?: number;
  gapPx?: number;
  tituloGeneral?: string;
  calidad?: number;
}

export function canvasElementoAJpeg(canvas: HTMLCanvasElement, calidad = 0.92): string {
  const fondo = fondoExportacionJpeg();
  const salida = document.createElement('canvas');
  salida.width = canvas.width;
  salida.height = canvas.height;
  const ctx = salida.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, salida.width, salida.height);
  ctx.drawImage(canvas, 0, 0);
  return salida.toDataURL('image/jpeg', calidad);
}

export function chartInstanciaAJpeg(chart: Chart | null | undefined, calidad = 0.92): string | undefined {
  if (!chart?.canvas) {
    return undefined;
  }
  const url = canvasElementoAJpeg(chart.canvas, calidad);
  return url || undefined;
}

function pintarCanvasConFondo(
  canvas: HTMLCanvasElement,
  fondo: string,
): HTMLCanvasElement {
  const capa = document.createElement('canvas');
  capa.width = canvas.width;
  capa.height = canvas.height;
  const ctx = capa.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, capa.width, capa.height);
  ctx.drawImage(canvas, 0, 0);
  return capa;
}

export function combinarCanvasesAJpeg(
  bloques: BloqueExportacionGrafico[],
  opciones?: OpcionesCombinarCanvasesJpeg,
): string | undefined {
  const validos = bloques.filter((b) => b.canvas.width > 0 && b.canvas.height > 0);
  if (validos.length === 0) {
    return undefined;
  }

  const padding = opciones?.paddingPx ?? 28;
  const gap = opciones?.gapPx ?? 20;
  const fondo = opciones?.fondo ?? fondoExportacionJpeg();
  const calidad = opciones?.calidad ?? 0.92;
  const texto = colorTextoExportacionJpeg();

  const anchoContenido = Math.max(...validos.map((b) => b.canvas.width), 320);
  const anchoTotal = anchoContenido + padding * 2;

  let altoTotal = padding;
  if (opciones?.tituloGeneral) {
    altoTotal += 32 + gap;
  }

  for (const bloque of validos) {
    altoTotal += bloque.canvas.height + (bloque.titulo ? 28 : 0);
  }
  altoTotal += gap * Math.max(validos.length - 1, 0) + padding;

  const salida = document.createElement('canvas');
  salida.width = anchoTotal;
  salida.height = altoTotal;
  const ctx = salida.getContext('2d');
  if (!ctx) {
    return undefined;
  }

  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, salida.width, salida.height);

  let y = padding;
  if (opciones?.tituloGeneral) {
    ctx.fillStyle = texto;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(opciones.tituloGeneral, padding, y + 22);
    y += 32 + gap;
  }

  validos.forEach((bloque, index) => {
    if (bloque.titulo) {
      ctx.fillStyle = texto;
      ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(bloque.titulo, padding, y + 18);
      y += 28;
    }
    const capa = pintarCanvasConFondo(bloque.canvas, fondo);
    const xOffset = padding + (anchoContenido - capa.width) / 2;
    ctx.drawImage(capa, xOffset, y);
    y += capa.height;
    if (index < validos.length - 1) {
      y += gap;
    }
  });

  return salida.toDataURL('image/jpeg', calidad);
}
