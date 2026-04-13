import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  Color,
  CreateColorPayload,
  UpdateColorPayload
} from './material.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion/material/color`;

  getColores(): Observable<ApiResponse<Color[]>> {
    return this.http.get<ApiResponse<Color[]>>(this.baseUrl);
  }

  createColor(payload: CreateColorPayload): Observable<ApiResponse<Color>> {
    return this.http.post<ApiResponse<Color>>(this.baseUrl, payload);
  }

  updateColor(payload: UpdateColorPayload): Observable<ApiResponse<Color>> {
    return this.http.put<ApiResponse<Color>>(this.baseUrl, payload);
  }

  deleteColor(id_color: number): Observable<ApiResponse<Color>> {
    return this.http.delete<ApiResponse<Color>>(this.baseUrl, {
      body: { id_color }
    });
  }
}
