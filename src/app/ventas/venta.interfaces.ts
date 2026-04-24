export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface VentaListFilters {
  fecha_inicio: string;
  fecha_fin: string;
  id_sucursal?: number | null;
}

export interface VentaResumen {
  id_venta?: number;
  created_at: string;
  cliente: string;
  nombre_sucursal: string;
  id_sucursal: number;
  total_qr: number | string;
  total_efect: number | string;
  total: number | string;
  updated_by: number;
}

export interface VentaDetalleRequest {
  id_venta: number;
}

export interface VentaDetalleItem {
  id_material: number;
  cantidad: number | string;
  precio: number | string;
  costo: number | string;
  cliente: string;
  total_qr: number | string;
}

export interface VentaMaterialRequest {
  id_sucursal: number;
}

export interface VentaMaterialOption {
  id_material: number;
  cantidad: number;
  codigo: string;
  nombre: string;
  id_categoria: number;
  nombre_categoria: string;
  id_color: number;
  nombre_color: string;
  codigo_color: string;
  precio: number;
  costo: number;
  fecha_vencimiento: string | null;
  medida: string;
  id_reciclado?: number;
  is_reciclado: boolean | number;
}

export interface VentaDetallePayload {
  id_material: number;
  cantidad: number;
  precio: number;
  costo: number;
}

export interface VentaCreatePayload {
  total_qr: number;
  cliente: string;
  id_sucursal: number;
  detalles: VentaDetallePayload[];
}

export interface VentaUpdatePayload extends VentaCreatePayload {
  id_venta: number;
}

export interface VentaPersistedDetalle {
  id_material: number;
  cantidad: number;
  precio: number;
  costo: number;
  subtotal: number;
}

export interface VentaPersisted {
  id_venta: number;
  cliente: string;
  id_sucursal: number;
  total_qr: number;
  total_efect: number;
  total: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  estado: boolean | number;
  detalles: VentaPersistedDetalle[];
}

export interface VentaDeletePayload {
  id_venta: number;
}

export interface VentaEstadoResponse {
  id_venta: number;
  estado: boolean | number;
}
