import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  VentaCreatePayload,
  VentaDeletePayload,
  VentaDetalleItem,
  VentaDetalleRequest,
  VentaEstadoResponse,
  VentaListFilters,
  VentaMaterialOption,
  VentaMaterialRequest,
  VentaPersisted,
  VentaResumen,
  VentaUpdatePayload,
} from './venta.interfaces';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/venta`;

  getVentas(filters: VentaListFilters): Observable<ApiResponse<VentaResumen[]>> {
    let params = new HttpParams()
      .set('fecha_inicio', this.toText(filters.fecha_inicio))
      .set('fecha_fin', this.toText(filters.fecha_fin));

    const idSucursal = this.toNumber(filters.id_sucursal);
    if (idSucursal > 0) {
      params = params.set('id_sucursal', String(idSucursal));
    }

    return this.http.get<ApiResponse<VentaResumen[]>>(this.baseUrl, { params });
  }

  getVentaDetalle(id_venta: number): Observable<ApiResponse<VentaDetalleItem[]>> {
    const payload: VentaDetalleRequest = {
      id_venta: this.toNumber(id_venta),
    };

    const params = new HttpParams().set('id_venta', String(payload.id_venta));

    return this.http.request<ApiResponse<VentaDetalleItem[]>>('GET', `${this.baseUrl}/detalle`, {
      body: payload,
      params,
    });
  }

  getVentaMateriales(id_sucursal: number): Observable<ApiResponse<VentaMaterialOption[]>> {
    const payload: VentaMaterialRequest = {
      id_sucursal: this.toNumber(id_sucursal),
    };

    const params = new HttpParams().set('id_sucursal', String(payload.id_sucursal));

    return this.http.request<ApiResponse<VentaMaterialOption[]>>('GET', `${this.baseUrl}/material`, {
      body: payload,
      params,
    });
  }

  createVenta(payload: VentaCreatePayload): Observable<ApiResponse<VentaPersisted>> {
    return this.http.post<ApiResponse<VentaPersisted>>(this.baseUrl, this.toVentaPayload(payload));
  }

  updateVenta(payload: VentaUpdatePayload): Observable<ApiResponse<VentaPersisted>> {
    return this.http.put<ApiResponse<VentaPersisted>>(this.baseUrl, {
      id_venta: this.toNumber(payload.id_venta),
      ...this.toVentaPayload(payload),
    });
  }

  deleteVenta(id_venta: number): Observable<ApiResponse<VentaEstadoResponse>> {
    const payload: VentaDeletePayload = {
      id_venta: this.toNumber(id_venta),
    };

    return this.http.delete<ApiResponse<VentaEstadoResponse>>(this.baseUrl, {
      body: payload,
    });
  }

  private toVentaPayload(payload: VentaCreatePayload | VentaUpdatePayload): VentaCreatePayload {
    return {
      total_qr: this.toNumber(payload.total_qr),
      cliente: this.toText(payload.cliente),
      id_sucursal: this.toNumber(payload.id_sucursal),
      detalles: payload.detalles.map((detalle) => ({
        id_material: this.toNumber(detalle.id_material),
        cantidad: this.toNumber(detalle.cantidad),
        precio: this.toNumber(detalle.precio),
        costo: this.toNumber(detalle.costo),
      })),
    };
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
