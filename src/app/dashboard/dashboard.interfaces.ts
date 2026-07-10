export interface DashboardVentasData {
  total_ventas: number;
  total_ventas_monto: number;
  total_qr: number;
  total_efect: number;
}

export interface DashboardObrasData {
  total_obras_activas: number;
  total_saldo_pendiente: number;
  total_herramientas_perdidas: number;
  total_herramientas_danadas: number;
}

export interface DashboardObraGraficoItem {
  id_obra: number;
  nombre_obra: string;
  precio_total: number;
  total_personal_acordado: number;
  total_material: number;
  costo_total: number;
  utilidad_estimada: number;
  series: {
    personal: number;
    material: number;
    utilidad: number;
    perdida: number;
  };
}

export interface DashboardDistribucionIngresosMateriales {
  ventas_pct: number;
  obras_pct: number;
}

export interface DashboardDeudorItem {
  id_obra_pago: number;
  nombre_cliente: string;
  nombre_obra: string;
  num_cel: string;
  fecha_pactada: string;
  monto_pactado: number;
  estado: string;
}

export interface DashboardStockCriticoItem {
  id_material: number;
  id_sucursal: number;
  nombre_material: string;
  nombre_categoria: string;
  cantidad: number;
}

export interface DashboardDateRange {
  inicio: string;
  fin: string;
}

export interface DashboardData {
  ventas: DashboardVentasData;
  obras: DashboardObrasData;
  obras_grafico: DashboardObraGraficoItem[];
  distribucion_ingresos_materiales: DashboardDistribucionIngresosMateriales;
  deudores: DashboardDeudorItem[];
  stock_critico: DashboardStockCriticoItem[];
  rango_fechas: DashboardDateRange;
}
