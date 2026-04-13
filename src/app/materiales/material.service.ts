import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  CreateMaterialPayload,
  Material,
  MaterialStockDetail,
  UpdateMaterialPayload
} from './material.interfaces';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion/material`;

  getMateriales(): Observable<ApiResponse<Material[]>> {
    return this.http.get<ApiResponse<Material[]>>(this.baseUrl);
  }

  getMaterialStock(id_material: number): Observable<ApiResponse<MaterialStockDetail>> {
    const params = new HttpParams().set('id_material', id_material);
    return this.http.get<ApiResponse<MaterialStockDetail>>(`${this.baseUrl}/stock`, { params });
  }

  createMaterial(material: Partial<Material>): Observable<ApiResponse<Material>> {
    const payload = this.toCreatePayload(material);
    return this.http.post<ApiResponse<Material>>(this.baseUrl, payload);
  }

  updateMaterial(material: Partial<Material>): Observable<ApiResponse<Material>> {
    const payload = this.toUpdatePayload(material);
    return this.http.put<ApiResponse<Material>>(this.baseUrl, payload);
  }

  desactivarMaterial(id_material: number): Observable<ApiResponse<Material>> {
    return this.http.delete<ApiResponse<Material>>(this.baseUrl, {
      body: { id_material }
    });
  }

  activarMaterial(id_material: number): Observable<ApiResponse<Material>> {
    return this.http.patch<ApiResponse<Material>>(this.baseUrl, { id_material });
  }

  private toCreatePayload(material: Partial<Material>): CreateMaterialPayload {
    const {
      codigo,
      nombre,
      id_categoria,
      id_color,
      costo,
      precio,
      fecha_vencimiento,
      medida,
      is_reciclado
    } = material;

    return {
      codigo,
      nombre,
      id_categoria,
      id_color,
      costo,
      precio,
      fecha_vencimiento,
      medida,
      is_reciclado
    };
  }

  private toUpdatePayload(material: Partial<Material>): UpdateMaterialPayload {
    if (material.id_material === undefined) {
      throw new Error('El campo id_material es requerido para actualizar un material.');
    }

    const basePayload: CreateMaterialPayload = this.toCreatePayload(material);

    return {
      id_material: material.id_material,
      ...basePayload
    };
  }
}
