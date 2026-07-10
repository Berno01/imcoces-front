import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardData } from './dashboard.interfaces';

export interface ApiResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  getDashboardData(
    idSucursal: number = 0,
    fechaInicio?: string,
    fechaFin?: string,
  ): Observable<ApiResponse<DashboardData>> {
    let params = new HttpParams();
    if (idSucursal > 0) {
      params = params.set('id_sucursal', String(idSucursal));
    }
    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }

    return this.http.get<ApiResponse<DashboardData>>(this.baseUrl, { params });
  }
}
