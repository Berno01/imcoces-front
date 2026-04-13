import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  Categoria,
  CreateCategoriaPayload,
  UpdateCategoriaPayload
} from './material.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion/material/categoria`;

  getCategorias(): Observable<ApiResponse<Categoria[]>> {
    return this.http.get<ApiResponse<Categoria[]>>(this.baseUrl);
  }

  createCategoria(payload: CreateCategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.post<ApiResponse<Categoria>>(this.baseUrl, payload);
  }

  updateCategoria(payload: UpdateCategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.put<ApiResponse<Categoria>>(this.baseUrl, payload);
  }

  deleteCategoria(id_categoria: number): Observable<ApiResponse<Categoria>> {
    return this.http.delete<ApiResponse<Categoria>>(this.baseUrl, {
      body: { id_categoria }
    });
  }
}
