import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  Herramienta,
  HerramientaCreatePayload,
  HerramientaStockDetail,
  HerramientaEstadoResponse,
  HerramientaUpdatePayload,
} from './herramienta.interfaces';

@Injectable({
  providedIn: 'root',
})
export class HerramientaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion/herramienta`;
  private readonly stockBaseUrl = `${environment.apiUrl}/inventario/herramientas/stock`;

  getHerramientas(id_sucursal?: number): Observable<ApiResponse<Herramienta[]>> {
    let params = new HttpParams();

    if (typeof id_sucursal === 'number') {
      params = params.set('id_sucursal', id_sucursal);
    }

    return this.http.get<ApiResponse<Herramienta[]>>(this.baseUrl, { params });
  }

  getHerramientaStock(id_herramienta: number): Observable<ApiResponse<HerramientaStockDetail>> {
    const params = new HttpParams().set('id_herramienta', id_herramienta);
    return this.http
      .get<unknown>(this.stockBaseUrl, { params })
      .pipe(map((response) => this.normalizeHerramientaStockResponse(response)));
  }

  createHerramienta(payload: HerramientaCreatePayload): Observable<ApiResponse<Herramienta>> {
    return this.http.post<ApiResponse<Herramienta>>(this.baseUrl, payload);
  }

  updateHerramienta(payload: HerramientaUpdatePayload): Observable<ApiResponse<Herramienta>> {
    return this.http.put<ApiResponse<Herramienta>>(this.baseUrl, payload);
  }

  desactivarHerramienta(
    id_herramienta: number,
  ): Observable<ApiResponse<HerramientaEstadoResponse>> {
    return this.http.delete<ApiResponse<HerramientaEstadoResponse>>(this.baseUrl, {
      body: { id_herramienta },
    });
  }

  activarHerramienta(id_herramienta: number): Observable<ApiResponse<HerramientaEstadoResponse>> {
    return this.http.patch<ApiResponse<HerramientaEstadoResponse>>(this.baseUrl, {
      id_herramienta,
    });
  }

  private normalizeHerramientaStockResponse(
    response: unknown,
  ): ApiResponse<HerramientaStockDetail> {
    const root = this.toObject(response);
    const payload = this.toObject(root?.['data']) ?? root;
    const sucursalesRaw = Array.isArray(payload?.['sucursales']) ? payload['sucursales'] : [];
    const sucursales: HerramientaStockDetail['sucursales'] = [];

    for (const sucursalRaw of sucursalesRaw) {
      const sucursal = this.toObject(sucursalRaw);
      if (!sucursal) {
        continue;
      }

      const idSucursal = this.toNumber(sucursal['id_sucursal']);
      if (idSucursal <= 0) {
        continue;
      }

      sucursales.push({
        id_herramienta: this.toNumber(sucursal['id_herramienta']),
        id_sucursal: idSucursal,
        nombre_sucursal:
          typeof sucursal['nombre_sucursal'] === 'string' ? sucursal['nombre_sucursal'] : undefined,
        cantidad_disponible: this.toNumber(sucursal['cantidad_disponible']),
        cantidad_total: this.toNumber(sucursal['cantidad_total']),
      });
    }

    const normalized: HerramientaStockDetail = {
      id_herramienta: this.toNumber(payload?.['id_herramienta']),
      sucursales,
    };

    return {
      message: typeof root?.['message'] === 'string' ? root['message'] : undefined,
      data: normalized,
    };
  }

  private toObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
