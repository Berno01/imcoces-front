export interface AuthTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id_rol: number;
  id_usuario?: number;
  login?: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  apellido?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  usuario: AuthUser;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  message?: string;
  data: {
    token: AuthTokenData;
    usuario: AuthUser;
  };
}

export interface RefreshResponse {
  message?: string;
  data: AuthTokenData;
}

export interface MeResponse {
  data: AuthUser;
}

export interface LogoutResponse {
  message?: string;
}
