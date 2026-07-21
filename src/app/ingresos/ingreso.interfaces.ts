export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export type EstadoIngreso = boolean | number;

export interface IngresoListFilters {
  id_sucursal: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface IngresoResumen {
  id_ingreso: number;
  fecha_hora: string;
  id_sucursal: number;
  nombre_sucursal: string;
  cant_materiales: number | string;
  estado: EstadoIngreso;
  total: number;
}

export interface IngresoDetalle {
  id_detalle_ingreso: number;
  id_ingreso: number;
  id_material: number;
  id_categoria: number;
  nombre_categoria: string;
  nombre: string;
  costo_unitario: number;
  cantidad: number;
  codigo?: string;
}

export interface IngresoDetallePayload {
  id_ingreso: number;
}

export interface IngresoCreateDetallePayload {
  id_material: number;
  cantidad: number;
  costo_unitario: number;
}

export interface IngresoCreatePayload {
  id_sucursal: number;
  detalle_ingreso: IngresoCreateDetallePayload[];
}

export interface IngresoUpdatePayload extends IngresoCreatePayload {
  id_ingreso: number;
}

export interface IngresoCreateDetalleResponse {
  id_material: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface IngresoCreateResponseData {
  id_ingreso: number;
  id_sucursal: number;
  fecha_hora: string;
  estado: EstadoIngreso;
  total: number;
  detalle_ingreso: IngresoCreateDetalleResponse[];
}

export type IngresoUpdateResponseData = IngresoCreateResponseData;

export interface IngresoEstadoResponseData {
  id_ingreso: number;
  estado: EstadoIngreso;
}

export interface IngresoMaterialSucursal {
  id_sucursal: number;
  cantidad: number;
}

export interface IngresoMaterialOption {
  id_material: number;
  codigo: string;
  nombre: string;
  id_categoria: number;
  id_color: number;
  nombre_color: string;
  codigo_color: string;
  precio: number;
  costo_unitario: number;
  is_reciclado: boolean | number;
  medida: string;
  cantidad: number;
  sucursales: IngresoMaterialSucursal[];
}
