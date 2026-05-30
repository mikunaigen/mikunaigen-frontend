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
