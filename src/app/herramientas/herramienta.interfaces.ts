export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export type EstadoHerramienta = boolean | number;

export interface CategoriaHerramienta {
  id_categoria_herramienta?: number;
  nombre: string;
  estado?: EstadoHerramienta;
}

export interface CategoriaHerramientaCreatePayload {
  nombre: string;
}

export interface CategoriaHerramientaUpdatePayload {
  id_categoria_herramienta: number;
  nombre: string;
}

export interface HerramientaStock {
  id_sucursal: number;
  cantidad: number;
  nombre_sucursal?: string;
}

export interface HerramientaStockSucursalDetail {
  id_herramienta: number;
  id_sucursal: number;
  nombre_sucursal?: string;
  cantidad_disponible: number;
  cantidad_total: number;
}

export interface HerramientaStockDetail {
  id_herramienta: number;
  sucursales: HerramientaStockSucursalDetail[];
}

export interface SucursalHerramientaOption {
  id_sucursal: number;
  nombre_sucursal: string;
}

export interface Herramienta {
  id_herramienta?: number;
  nombre: string;
  id_categoria_herramienta: number;
  nombre_categoria_herramienta?: string;
  cantidad_disponible?: string;
  cantidad_total?: string;
  estado?: EstadoHerramienta;
  stocks?: HerramientaStock[];
}

export interface HerramientaCreatePayload {
  nombre: string;
  id_categoria_herramienta: number;
  stocks: HerramientaStock[];
}

export interface HerramientaUpdatePayload extends HerramientaCreatePayload {
  id_herramienta: number;
}

export interface HerramientaToggleEstadoPayload {
  id_herramienta: number;
}

export interface HerramientaEstadoResponse {
  id_herramienta: number;
  estado: EstadoHerramienta;
}
