import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  ObraCreatePayload,
  ObraDeudaPagoCreatePayload,
  ObraDeudaPagoDeleteResponse,
  ObraDeudaPagoPersisted,
  ObraDeudaPagoUpdatePayload,
  ObraDeudaDetalle,
  ObraDeudorClienteItem,
  ObraDetalle,
  ObraDetalleRequest,
  ObraHerramientaDevolucionPayload,
  ObraHerramientaDevolucionResult,
  ObraHerramientaDisponible,
  ObraHerramientaDetalle,
  ObraHerramientaSyncPayload,
  ObraHerramientaSyncResult,
  ObraMaterialDisponible,
  ObraMaterialDetalle,
  ObraMaterialRecicladosPayload,
  ObraMaterialRecicladosResult,
  ObraMaterialSyncPayload,
  ObraPersonalDisponible,
  ObraPersonalPagoDetalleResumen,
  ObraPersonalPagoDetalleRequest,
  ObraPersonalPagoDeleteResponse,
  ObraPersonalPagoPersisted,
  ObraPersonalPagoPayload,
  ObraPersonalPagoUpdatePayload,
  ObraPersonalSyncPayload,
  ObraPersonalSyncResult,
  ObraPersisted,
  ObraResumen,
  ObraUpdatePayload,
} from './obra.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ObraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/obra`;

  getObras(): Observable<ApiResponse<ObraResumen[]>> {
    return this.http.get<ApiResponse<ObraResumen[]>>(this.baseUrl);
  }

  getObraDetalle(id_obra: number): Observable<ApiResponse<ObraDetalle>> {
    const payload: ObraDetalleRequest = {
      id_obra: this.toNumber(id_obra),
    };

    const params = new HttpParams().set('id_obra', String(payload.id_obra));

    return this.http.request<ApiResponse<ObraDetalle>>('GET', `${this.baseUrl}/detalle`, {
      body: payload,
      params,
    });
  }

  getObraDetalleDeuda(id_obra: number): Observable<ApiResponse<ObraDeudaDetalle>> {
    const payload: ObraDetalleRequest = {
      id_obra: this.toNumber(id_obra),
    };

    const params = new HttpParams().set('id_obra', String(payload.id_obra));

    return this.http.request<ApiResponse<ObraDeudaDetalle>>(
      'GET',
      `${this.baseUrl}/detalle/deuda`,
      {
        body: payload,
        params,
      },
    );
  }

  getObraDetalleHerramienta(id_obra: number): Observable<ApiResponse<ObraHerramientaDetalle>> {
    const payload: ObraDetalleRequest = {
      id_obra: this.toNumber(id_obra),
    };

    const params = new HttpParams().set('id_obra', String(payload.id_obra));

    return this.http.request<ApiResponse<ObraHerramientaDetalle>>(
      'GET',
      `${this.baseUrl}/detalle/herramienta`,
      {
        body: payload,
        params,
      },
    );
  }

  getObraDetalleMaterial(id_obra: number): Observable<ApiResponse<ObraMaterialDetalle>> {
    const payload: ObraDetalleRequest = {
      id_obra: this.toNumber(id_obra),
    };

    const params = new HttpParams().set('id_obra', String(payload.id_obra));

    return this.http.request<ApiResponse<ObraMaterialDetalle>>(
      'GET',
      `${this.baseUrl}/detalle/material`,
      {
        body: payload,
        params,
      },
    );
  }

  getObraHerramientas(id_sucursal: number): Observable<ApiResponse<ObraHerramientaDisponible[]>> {
    const payload = { id_sucursal: this.toNumber(id_sucursal) };
    const params = new HttpParams().set('id_sucursal', String(payload.id_sucursal));

    return this.http.request<ApiResponse<ObraHerramientaDisponible[]>>(
      'GET',
      `${this.baseUrl}/herramienta`,
      {
        body: payload,
        params,
      },
    );
  }

  syncObraHerramientas(
    payload: ObraHerramientaSyncPayload,
  ): Observable<ApiResponse<ObraHerramientaSyncResult>> {
    return this.http.put<ApiResponse<ObraHerramientaSyncResult>>(`${this.baseUrl}/herramienta`, {
      id_obra: this.toNumber(payload.id_obra),
      herramientas: payload.herramientas.map((herramienta) => ({
        id_herramienta: this.toNumber(herramienta.id_herramienta),
        cantidad_asignada: this.toNumber(herramienta.cantidad_asignada),
      })),
    });
  }

  registrarDevolucionHerramientas(
    payload: ObraHerramientaDevolucionPayload,
  ): Observable<ApiResponse<ObraHerramientaDevolucionResult>> {
    return this.http.request<ApiResponse<ObraHerramientaDevolucionResult>>(
      'POST',
      `${this.baseUrl}/herramienta/devolucion`,
      {
        body: {
          id_obra: this.toNumber(payload.id_obra),
          herramientas: payload.herramientas.map((herramienta) => ({
            id_herramienta: this.toNumber(herramienta.id_herramienta),
            cantidad_devuelta: this.toNumber(herramienta.cantidad_devuelta),
            cantidad_danada: this.toNumber(herramienta.cantidad_danada),
            cantidad_perdida: this.toNumber(herramienta.cantidad_perdida),
          })),
        },
      },
    );
  }

  actualizarDevolucionHerramientas(
    payload: ObraHerramientaDevolucionPayload,
  ): Observable<ApiResponse<ObraHerramientaDevolucionResult>> {
    return this.http.request<ApiResponse<ObraHerramientaDevolucionResult>>(
      'PUT',
      `${this.baseUrl}/herramienta/devolucion`,
      {
        body: {
          id_obra: this.toNumber(payload.id_obra),
          herramientas: payload.herramientas.map((herramienta) => ({
            id_herramienta: this.toNumber(herramienta.id_herramienta),
            cantidad_devuelta: this.toNumber(herramienta.cantidad_devuelta),
            cantidad_danada: this.toNumber(herramienta.cantidad_danada),
            cantidad_perdida: this.toNumber(herramienta.cantidad_perdida),
          })),
        },
      },
    );
  }

  getObraMateriales(id_sucursal: number): Observable<ApiResponse<ObraMaterialDisponible[]>> {
    const payload = { id_sucursal: this.toNumber(id_sucursal) };
    const params = new HttpParams().set('id_sucursal', String(payload.id_sucursal));

    return this.http.request<ApiResponse<ObraMaterialDisponible[]>>(
      'GET',
      `${this.baseUrl}/material`,
      {
        body: payload,
        params,
      },
    );
  }

  syncObraMateriales(
    payload: ObraMaterialSyncPayload,
  ): Observable<ApiResponse<ObraMaterialDetalle>> {
    return this.http.put<ApiResponse<ObraMaterialDetalle>>(`${this.baseUrl}/material`, {
      id_obra: this.toNumber(payload.id_obra),
      materiales: payload.materiales.map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad_usada: this.toNumber(material.cantidad_usada),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      })),
    });
  }

  registrarMaterialesReciclados(
    payload: ObraMaterialRecicladosPayload,
  ): Observable<ApiResponse<ObraMaterialRecicladosResult>> {
    return this.http.post<ApiResponse<ObraMaterialRecicladosResult>>(
      `${this.baseUrl}/material/reciclados`,
      this.toMaterialRecicladosPayload(payload),
    );
  }

  actualizarMaterialesReciclados(
    payload: ObraMaterialRecicladosPayload,
  ): Observable<ApiResponse<ObraMaterialRecicladosResult>> {
    return this.http.put<ApiResponse<ObraMaterialRecicladosResult>>(
      `${this.baseUrl}/material/reciclados`,
      this.toMaterialRecicladosPayload(payload),
    );
  }

  getObraPersonal(): Observable<ApiResponse<ObraPersonalDisponible[]>> {
    return this.http.get<ApiResponse<ObraPersonalDisponible[]>>(`${this.baseUrl}/personal`);
  }

  syncObraPersonal(
    payload: ObraPersonalSyncPayload,
  ): Observable<ApiResponse<ObraPersonalSyncResult>> {
    return this.http.put<ApiResponse<ObraPersonalSyncResult>>(`${this.baseUrl}/personal`, {
      id_obra: this.toNumber(payload.id_obra),
      personales: payload.personales.map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(personal.pago_acordado),
      })),
    });
  }

  getObraDeudores(): Observable<ApiResponse<ObraDeudorClienteItem[]>> {
    return this.http.get<ApiResponse<ObraDeudorClienteItem[]>>(`${this.baseUrl}/deudores`);
  }

  createObraPago(
    payload: ObraDeudaPagoCreatePayload,
  ): Observable<ApiResponse<ObraDeudaPagoPersisted>> {
    return this.http.post<ApiResponse<ObraDeudaPagoPersisted>>(`${this.baseUrl}/detalle/deuda`, {
      id_obra: this.toNumber(payload.id_obra),
      fecha_pactada: this.toText(payload.fecha_pactada),
      monto_pactado: this.toNumber(payload.monto_pactado),
    });
  }

  updateObraPago(
    payload: ObraDeudaPagoUpdatePayload,
  ): Observable<ApiResponse<ObraDeudaPagoPersisted>> {
    return this.http.put<ApiResponse<ObraDeudaPagoPersisted>>(`${this.baseUrl}/detalle/deuda`, {
      id_obra_pago: this.toNumber(payload.id_obra_pago),
      id_obra: this.toNumber(payload.id_obra),
      fecha_pactada: this.toText(payload.fecha_pactada),
      monto_pactado: this.toNumber(payload.monto_pactado),
      estado: this.normalizeBooleanLike(payload.estado),
    });
  }

  deleteObraPago(id_obra_pago: number): Observable<ApiResponse<ObraDeudaPagoDeleteResponse>> {
    return this.http.delete<ApiResponse<ObraDeudaPagoDeleteResponse>>(
      `${this.baseUrl}/detalle/deuda`,
      {
        body: {
          id_obra_pago: this.toNumber(id_obra_pago),
        },
      },
    );
  }

  createObraPersonalPago(
    payload: ObraPersonalPagoPayload,
  ): Observable<ApiResponse<ObraPersonalPagoPersisted>> {
    return this.http.post<ApiResponse<ObraPersonalPagoPersisted>>(
      `${this.baseUrl}/detalle/personal-pagos`,
      {
        id_obra: this.toNumber(payload.id_obra),
        id_usuario: this.toNumber(payload.id_usuario),
        tipo: this.toText(payload.tipo),
        descripcion: this.toNullableText(payload.descripcion),
        fecha: this.toText(payload.fecha),
        monto: this.toNumber(payload.monto),
      },
    );
  }

  updateObraPersonalPago(
    payload: ObraPersonalPagoUpdatePayload,
  ): Observable<ApiResponse<ObraPersonalPagoPersisted>> {
    return this.http.put<ApiResponse<ObraPersonalPagoPersisted>>(
      `${this.baseUrl}/detalle/personal-pagos`,
      {
        id_movimiento: this.toNumber(payload.id_movimiento),
        id_obra: this.toNumber(payload.id_obra),
        id_usuario: this.toNumber(payload.id_usuario),
        tipo: this.toText(payload.tipo),
        descripcion: this.toNullableText(payload.descripcion),
        fecha: this.toText(payload.fecha),
        monto: this.toNumber(payload.monto),
      },
    );
  }

  deleteObraPersonalPago(
    id_movimiento: number,
  ): Observable<ApiResponse<ObraPersonalPagoDeleteResponse>> {
    return this.http.delete<ApiResponse<ObraPersonalPagoDeleteResponse>>(
      `${this.baseUrl}/detalle/personal-pagos`,
      {
        body: {
          id_movimiento: this.toNumber(id_movimiento),
        },
      },
    );
  }

  getObraDetallePersonalPagos(
    id_obra: number,
    id_usuario: number,
  ): Observable<ApiResponse<ObraPersonalPagoDetalleResumen>> {
    const payload: ObraPersonalPagoDetalleRequest = {
      id_obra: this.toNumber(id_obra),
      id_usuario: this.toNumber(id_usuario),
    };

    const params = new HttpParams()
      .set('id_obra', String(payload.id_obra))
      .set('id_usuario', String(payload.id_usuario));

    return this.http.request<ApiResponse<ObraPersonalPagoDetalleResumen>>(
      'GET',
      `${this.baseUrl}/detalle/personal-pagos`,
      {
        body: payload,
        params,
      },
    );
  }

  getObraDeudoresDetalle(id_obra: number): Observable<ApiResponse<ObraDeudaDetalle>> {
    return this.getObraDetalleDeuda(id_obra);
  }

  createObra(payload: ObraCreatePayload): Observable<ApiResponse<ObraPersisted>> {
    return this.http.post<ApiResponse<ObraPersisted>>(this.baseUrl, this.toObraPayload(payload));
  }

  updateObra(payload: ObraUpdatePayload): Observable<ApiResponse<ObraPersisted>> {
    return this.http.put<ApiResponse<ObraPersisted>>(
      this.baseUrl,
      this.toObraUpdatePayload(payload),
    );
  }

  private toObraPayload(payload: ObraCreatePayload): ObraCreatePayload {
    return {
      nombre_obra: this.toText(payload.nombre_obra),
      nombre_cliente: this.toText(payload.nombre_cliente),
      num_cel: this.toText(payload.num_cel),
      ubicacion: this.toText(payload.ubicacion),
      id_sucursal: this.toNumber(payload.id_sucursal),
      fecha_inicio: this.toText(payload.fecha_inicio),
      fecha_fin: this.toNullableText(payload.fecha_fin),
      metros_cuadrados: this.toNumber(payload.metros_cuadrados),
      materiales: (payload.materiales ?? []).map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad_usada: this.toNumber(material.cantidad_usada),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      })),
      personales: (payload.personales ?? []).map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(personal.pago_acordado),
      })),
      herramientas: (payload.herramientas ?? []).map((herramienta) => ({
        id_herramienta: this.toNumber(herramienta.id_herramienta),
        cantidad_asignada: this.toNumber(herramienta.cantidad_asignada),
      })),
    };
  }

  private toObraUpdatePayload(payload: ObraUpdatePayload): ObraUpdatePayload {
    return {
      id_obra: this.toNumber(payload.id_obra),
      nombre_obra: this.toText(payload.nombre_obra),
      nombre_cliente: this.toText(payload.nombre_cliente),
      num_cel: this.toText(payload.num_cel),
      ubicacion: this.toText(payload.ubicacion),
      fecha_inicio: this.toText(payload.fecha_inicio),
      fecha_fin: this.toNullableText(payload.fecha_fin),
      metros_cuadrados: this.toNumber(payload.metros_cuadrados),
      materiales: (payload.materiales ?? []).map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad_usada: this.toNumber(material.cantidad_usada),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      })),
      personales: (payload.personales ?? []).map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(personal.pago_acordado),
      })),
      herramientas: (payload.herramientas ?? []).map((herramienta) => ({
        id_herramienta: this.toNumber(herramienta.id_herramienta),
        cantidad_asignada: this.toNumber(herramienta.cantidad_asignada),
      })),
    };
  }

  private toMaterialRecicladosPayload(
    payload: ObraMaterialRecicladosPayload,
  ): ObraMaterialRecicladosPayload {
    return {
      id_obra: this.toNumber(payload.id_obra),
      materiales_completos: payload.materiales_completos.map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad: this.toNumber(material.cantidad),
      })),
      materiales_reciclados: payload.materiales_reciclados.map((material) => ({
        id_material: this.toNumber(material.id_material),
        medida: this.toText(material.medida),
        cantidad: this.toNumber(material.cantidad),
      })),
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private toNullableText(value: unknown): string | null {
    const text = this.toText(value);
    return text.length > 0 ? text : null;
  }

  private normalizeBooleanLike(value: unknown): boolean | number {
    if (typeof value === 'boolean') {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
