import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  UsuarioCreatePayload,
  UsuarioDeletePayload,
  UsuarioDetalle,
  UsuarioDetalleRequest,
  UsuarioEstadoResponse,
  UsuarioPersisted,
  UsuarioResumen,
  UsuarioRol,
  UsuarioUpdatePayload,
} from './usuario.interfaces';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuario`;

  private readonly rolesState = signal<UsuarioRol[]>([]);
  private readonly rolesLoadedState = signal(false);
  private readonly rolesLoadingState = signal(false);
  private readonly rolesErrorState = signal<string | null>(null);

  private rolesInFlightRequest?: Observable<UsuarioRol[]>;

  readonly roles = computed(() => this.rolesState());
  readonly rolesLoaded = computed(() => this.rolesLoadedState());
  readonly rolesLoading = computed(() => this.rolesLoadingState());
  readonly rolesError = computed(() => this.rolesErrorState());

  getUsuarios(): Observable<ApiResponse<UsuarioResumen[]>> {
    return this.http.get<ApiResponse<UsuarioResumen[]>>(this.baseUrl);
  }

  getUsuarioDetalle(id_usuario: number): Observable<ApiResponse<UsuarioDetalle>> {
    const payload: UsuarioDetalleRequest = {
      id_usuario: this.toNumber(id_usuario),
    };

    const params = new HttpParams().set('id_usuario', String(payload.id_usuario));

    return this.http.request<ApiResponse<UsuarioDetalle>>('GET', `${this.baseUrl}/detalle`, {
      body: payload,
      params,
    });
  }

  getRoles(): Observable<ApiResponse<UsuarioRol[]>> {
    return this.http.get<ApiResponse<UsuarioRol[]>>(`${this.baseUrl}/rol`);
  }

  createUsuario(payload: UsuarioCreatePayload): Observable<ApiResponse<UsuarioPersisted>> {
    return this.http.post<ApiResponse<UsuarioPersisted>>(
      this.baseUrl,
      this.toUsuarioBasePayload(payload),
    );
  }

  updateUsuario(payload: UsuarioUpdatePayload): Observable<ApiResponse<UsuarioPersisted>> {
    return this.http.put<ApiResponse<UsuarioPersisted>>(this.baseUrl, {
      id_usuario: this.toNumber(payload.id_usuario),
      ...this.toUsuarioBasePayload(payload),
    });
  }

  desactivarUsuario(id_usuario: number): Observable<ApiResponse<UsuarioEstadoResponse>> {
    const payload: UsuarioDeletePayload = {
      id_usuario: this.toNumber(id_usuario),
    };

    return this.http.delete<ApiResponse<UsuarioEstadoResponse>>(this.baseUrl, {
      body: payload,
    });
  }

  loadRoles(forceReload = false): Observable<UsuarioRol[]> {
    if (!forceReload && this.rolesLoadedState()) {
      return of(this.rolesState());
    }

    if (!forceReload && this.rolesInFlightRequest) {
      return this.rolesInFlightRequest;
    }

    this.rolesLoadingState.set(true);
    this.rolesErrorState.set(null);

    const request$ = this.getRoles().pipe(
      map((response) => response.data ?? []),
      tap((roles) => {
        this.rolesState.set(roles);
        this.rolesLoadedState.set(true);
      }),
      catchError(() => {
        this.rolesState.set([]);
        this.rolesLoadedState.set(false);
        this.rolesErrorState.set('No se pudo cargar el catalogo de roles.');
        return of([]);
      }),
      finalize(() => {
        this.rolesLoadingState.set(false);
        this.rolesInFlightRequest = undefined;
      }),
      shareReplay(1),
    );

    this.rolesInFlightRequest = request$;
    return request$;
  }

  private toNumber(value: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toUsuarioBasePayload(
    payload: UsuarioCreatePayload | UsuarioUpdatePayload,
  ): UsuarioCreatePayload {
    return {
      nombre: this.toText(payload.nombre),
      apellidos: this.toText(payload.apellidos),
      num_cel: this.toText(payload.num_cel),
      id_rol: this.toNumber(payload.id_rol),
      login: this.toText(payload.login),
      password: this.toText(payload.password),
    };
  }

  private toText(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }
}
