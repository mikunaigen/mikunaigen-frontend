// Auxiliar que se eliminará a futura entrega final
export class ChartTester {
  static logPayload(tabName: string, payload: any): void {
    console.warn(`DATA API RECIBIDA (${tabName}):`, payload);
  }

  static logChart(chartId: string, config: any): void {
    const labels = config.data?.labels || [];
    const data = config.data?.datasets?.[0]?.data || [];
    
    console.log(`Validando gráfico [${chartId}]:`, {
      elementExists: !!document.getElementById(chartId),
      labelsCount: labels.length,
      dataCount: data.length,
      first5Labels: labels.slice(0, 5),
      first5Data: data.slice(0, 5)
    });

    if (labels.length === 0 || data.length === 0) {
      console.error(`Gráfico [${chartId}] no tiene datos suficientes para mostrarse.`);
    }
  }
}