export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface UsuarioResumen {
  id_usuario: number;
  nombre: string;
  nombre_rol: string;
  id_rol: number;
  total_descuento: string;
  saldo_pendiente: string;
}

export interface UsuarioDetalle {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  num_cel: string;
  id_rol: number;
  nombre_rol: string;
  login: string;
  estado: boolean | number;
}

export interface UsuarioRol {
  id_rol: number;
  nombre: string;
}

export interface UsuarioDetalleRequest {
  id_usuario: number;
}

export interface UsuarioBasePayload {
  nombre: string;
  apellidos: string;
  num_cel: string;
  id_rol: number;
  login: string;
  password: string;
}

export interface UsuarioCreatePayload extends UsuarioBasePayload {}

export interface UsuarioUpdatePayload extends UsuarioBasePayload {
  id_usuario: number;
}

export interface UsuarioDeletePayload {
  id_usuario: number;
}

export interface UsuarioPersisted {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  num_cel: string;
  id_rol: number;
  login: string;
  estado: boolean | number;
}

export interface UsuarioEstadoResponse {
  id_usuario: number;
  estado: boolean | number;
}
