export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export type FechaMaterial = string;
export type MedidaMaterial = string;
export type RecicladoMaterial = boolean | number;

export interface Categoria {
  id_categoria?: number;
  nombre_categoria?: string;
  nombre?: string;
  estado?: boolean;
}

export interface Color {
  id_color?: number;
  nombre_color?: string;
  nombre?: string;
  codigo_color?: string;
  codigo?: string;
  estado?: boolean;
}

export interface Material {
  id_material?: number;
  codigo: string;
  nombre: string;
  id_categoria: number;
  nombre_categoria?: string;
  id_color: number;
  nombre_color?: string;
  costo: number;
  precio: number;
  fecha_vencimiento: FechaMaterial;
  medida: MedidaMaterial;
  is_reciclado: RecicladoMaterial;
  cantidad?: number | null;
  id_sucursal?: number | null;
  total_stock?: string;
  estado?: boolean;
}

export interface MaterialStockSucursal {
  id_material: number;
  id_sucursal: number;
  nombre_sucursal: string;
  cantidad: number;
}

export interface MaterialStockDetail {
  id_material: number;
  total_stock: number;
  sucursales: MaterialStockSucursal[];
}

export interface CreateCategoriaPayload {
  nombre: string;
}

export interface UpdateCategoriaPayload {
  id_categoria: number;
  nombre: string;
}

export interface CreateColorPayload {
  nombre: string;
  codigo: string;
}

export interface UpdateColorPayload {
  id_color: number;
  nombre: string;
  codigo: string;
}

export type MaterialBasePayload = Pick<
  Material,
  | 'codigo'
  | 'nombre'
  | 'id_categoria'
  | 'id_color'
  | 'costo'
  | 'precio'
  | 'fecha_vencimiento'
  | 'medida'
  | 'is_reciclado'
>;

export type CreateMaterialPayload = Partial<MaterialBasePayload>;

export type UpdateMaterialPayload = Partial<MaterialBasePayload> & {
  id_material: number;
};
