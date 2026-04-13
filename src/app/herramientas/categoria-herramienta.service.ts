import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  CategoriaHerramienta,
  CategoriaHerramientaCreatePayload,
  CategoriaHerramientaUpdatePayload
} from './herramienta.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CategoriaHerramientaService {
  private readonly http = inject(HttpClient);

  // El backend expone la ruta con "categoría"; se usa su forma URL-encoded para mantener ASCII.
  private readonly baseUrl = `${environment.apiUrl}/gestion/herramienta/categor%C3%ADa`;

  getCategoriasHerramienta(): Observable<ApiResponse<CategoriaHerramienta[]>> {
    return this.http.get<ApiResponse<CategoriaHerramienta[]>>(this.baseUrl);
  }

  createCategoriaHerramienta(
    payload: CategoriaHerramientaCreatePayload
  ): Observable<ApiResponse<CategoriaHerramienta>> {
    return this.http.post<ApiResponse<CategoriaHerramienta>>(this.baseUrl, payload);
  }

  updateCategoriaHerramienta(
    payload: CategoriaHerramientaUpdatePayload
  ): Observable<ApiResponse<CategoriaHerramienta>> {
    return this.http.put<ApiResponse<CategoriaHerramienta>>(this.baseUrl, payload);
  }

  deleteCategoriaHerramienta(
    id_categoria_herramienta: number
  ): Observable<ApiResponse<CategoriaHerramienta>> {
    return this.http.delete<ApiResponse<CategoriaHerramienta>>(this.baseUrl, {
      body: { id_categoria_herramienta }
    });
  }
}
