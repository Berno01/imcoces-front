import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  IngresoCreatePayload,
  IngresoCreateResponseData,
  IngresoDetalle,
  IngresoEstadoResponseData,
  IngresoListFilters,
  IngresoMaterialOption,
  IngresoResumen,
  IngresoUpdatePayload,
  IngresoUpdateResponseData,
} from './ingreso.interfaces';

@Injectable({
  providedIn: 'root',
})
export class IngresoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventario/ingreso`;

  getIngresos(filters: IngresoListFilters): Observable<ApiResponse<IngresoResumen[]>> {
    const params = new HttpParams()
      .set('id_sucursal', this.toParamNumber(filters.id_sucursal))
      .set('fecha_inicio', filters.fecha_inicio)
      .set('fecha_fin', filters.fecha_fin);

    return this.http.get<ApiResponse<IngresoResumen[]>>(this.baseUrl, { params });
  }

  getIngresoDetalle(id_ingreso: number): Observable<ApiResponse<IngresoDetalle[]>> {
    const payload = { id_ingreso: this.toNumber(id_ingreso) };
    const params = new HttpParams().set('id_ingreso', this.toParamNumber(id_ingreso));

    return this.http.request<ApiResponse<IngresoDetalle[]>>('GET', `${this.baseUrl}/detalle`, {
      body: payload,
      params,
    });
  }

  createIngreso(payload: IngresoCreatePayload): Observable<ApiResponse<IngresoCreateResponseData>> {
    return this.http.post<ApiResponse<IngresoCreateResponseData>>(
      this.baseUrl,
      this.toIngresoPayload(payload),
    );
  }

  updateIngreso(payload: IngresoUpdatePayload): Observable<ApiResponse<IngresoUpdateResponseData>> {
    return this.http.put<ApiResponse<IngresoUpdateResponseData>>(this.baseUrl, {
      id_ingreso: this.toNumber(payload.id_ingreso),
      ...this.toIngresoPayload(payload),
    });
  }

  desactivarIngreso(id_ingreso: number): Observable<ApiResponse<IngresoEstadoResponseData>> {
    return this.http.delete<ApiResponse<IngresoEstadoResponseData>>(this.baseUrl, {
      body: { id_ingreso: this.toNumber(id_ingreso) },
    });
  }

  getIngresoMateriales(): Observable<ApiResponse<IngresoMaterialOption[]>> {
    return this.http.get<ApiResponse<IngresoMaterialOption[]>>(`${this.baseUrl}/material`);
  }

  private toIngresoPayload(payload: IngresoCreatePayload): IngresoCreatePayload {
    return {
      id_sucursal: this.toNumber(payload.id_sucursal),
      detalle_ingreso: payload.detalle_ingreso.map((detalle) => ({
        id_material: this.toNumber(detalle.id_material),
        cantidad: this.toNumber(detalle.cantidad),
        costo_unitario: this.toNumber(detalle.costo_unitario),
      })),
    };
  }

  private toNumber(value: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toParamNumber(value: number): string {
    return String(this.toNumber(value));
  }
}
