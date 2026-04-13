export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface Sucursal {
  id_sucursal: number;
  nombre: string;
}
