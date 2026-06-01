export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface ObraResumen {
  id_obra?: number;
  nombre_obra: string;
  ubicacion: string;
  nombre_cliente: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface ObraPersonalDisponible {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  num_cel: string;
  id_rol: number;
  login: string;
  estado: boolean | number;
}

export interface ObraHerramientaDisponible {
  id_herramienta: number;
  nombre: string;
  estado: boolean | number;
  id_categoria_herramienta: number;
  nombre_categoria_herramienta: string;
  cantidad_disponible: number;
}

export interface ObraMaterialDisponible {
  id_material: number;
  cantidad: number;
  codigo: string;
  nombre: string;
  id_categoria: number;
  nombre_categoria: string;
  id_color: number;
  nombre_color: string;
  codigo_color: string;
  precio: number;
  costo: number;
  fecha_vencimiento: string | null;
  medida: string;
}

export interface ObraMaterialPayload {
  id_material: number;
  cantidad_usada: number;
  precio: number;
  costo: number;
}

export interface ObraPersonalPayload {
  id_usuario: number;
  pago_acordado: number;
}

export interface ObraPersonalSyncPayload {
  id_obra: number;
  personales: ObraPersonalPayload[];
}

export interface ObraPersonalSyncResult {
  id_obra: number;
  personales: ObraPersonalPayload[];
}

export interface ObraHerramientaPayload {
  id_herramienta: number;
  cantidad_asignada: number;
}

export interface ObraHerramientaSyncPayload {
  id_obra: number;
  herramientas: ObraHerramientaPayload[];
}

export interface ObraHerramientaDevolucionItemPayload {
  id_herramienta: number;
  cantidad_devuelta: number;
  cantidad_danada: number;
  cantidad_perdida: number;
}

export interface ObraHerramientaDevolucionPayload {
  id_obra: number;
  herramientas: ObraHerramientaDevolucionItemPayload[];
}

export interface ObraCreatePayload {
  nombre_obra: string;
  nombre_cliente: string;
  num_cel: string;
  ubicacion: string;
  id_sucursal: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  metros_cuadrados: number;
  materiales: ObraMaterialPayload[];
  personales: ObraPersonalPayload[];
  herramientas: ObraHerramientaPayload[];
}

export interface ObraUpdatePayload {
  id_obra: number;
  nombre_obra: string;
  nombre_cliente: string;
  num_cel: string;
  ubicacion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  metros_cuadrados: number;
  materiales?: ObraMaterialPayload[];
  personales?: ObraPersonalPayload[];
  herramientas?: ObraHerramientaPayload[];
}

export interface ObraPersisted extends ObraCreatePayload {
  id_obra: number;
  precio_mano_obra: number;
  precio_materiales: number;
  precio_total: number;
  saldo: number;
  estado: boolean | number | string;
}

export interface ObraDetalleRequest {
  id_obra: number;
}

export interface ObraDetallePersonal {
  id_usuario: number;
  nombre_usuario: string;
  nombre_rol: string;
  pago_acordado: number;
}

export interface ObraDetalle {
  id_obra?: number;
  id_sucursal?: number;
  nombre_cliente: string;
  nombre_obra: string;
  num_cel?: string | null;
  ubicacion: string;
  fecha_inicio: string;
  fecha_fin: string;
  metros_cuadrados?: number;
  precio_total: number;
  saldo: number;
  personales: ObraDetallePersonal[];
}

export interface ObraDeudaPago {
  id_obra_pago: number;
  fecha_pactada: string | null;
  monto_pactado: number;
  estado: boolean | number | string;
}

export interface ObraDeudaPagoCreatePayload {
  id_obra: number;
  fecha_pactada: string;
  monto_pactado: number;
}

export interface ObraDeudaPagoUpdatePayload extends ObraDeudaPagoCreatePayload {
  id_obra_pago: number;
  estado: boolean | number;
}

export interface ObraDeudaPagoPersisted {
  id_obra_pago: number;
  id_obra: number;
  fecha_pactada: string;
  monto_pactado: number;
  fecha_pago_real: string | null;
  estado: boolean | number | string;
}

export interface ObraDeudaPagoDeleteResponse {
  id_obra_pago: number;
  deleted: boolean;
}

export interface ObraPersonalPagoPayload {
  id_obra: number;
  id_usuario: number;
  tipo: 'adelanto' | 'descuento' | string;
  descripcion: string;
  fecha: string;
  monto: number;
}

export interface ObraPersonalPagoUpdatePayload extends ObraPersonalPagoPayload {
  id_movimiento: number;
}

export interface ObraPersonalPagoPersisted {
  id_movimiento: number;
  id_obra_personal: number;
  id_obra: number;
  id_usuario: number;
  tipo: 'adelanto' | 'descuento' | string;
  monto: number;
  descripcion: string | null;
  fecha: string;
}

export interface ObraPersonalPagoDeleteResponse {
  id_movimiento: number;
  deleted: boolean;
}

export interface ObraPersonalPagoDetalleRequest {
  id_obra: number;
  id_usuario: number;
}

export interface ObraPersonalPagoMovimientoDetalle {
  id_movimiento: number;
  tipo: 'adelanto' | 'descuento' | string;
  monto: number;
  fecha: string;
  descripcion: string | null;
}

export interface ObraPersonalPagoDetalleItem {
  id_usuario: number;
  nombre_usuario: string;
  pago_acordado: number;
  total_adelanto: number;
  total_descuento: number;
  saldo_pendiente: number;
  pagos: ObraPersonalPagoMovimientoDetalle[];
}

export interface ObraPersonalPagoDetalleResumen {
  total_acordado: number;
  total_adelanto: number;
  total_descuento: number;
  saldo_pendiente: number;
  personales: ObraPersonalPagoDetalleItem[];
}

export interface ObraDeudaDetalle {
  saldo: number;
  precio_total: number;
  pagos: ObraDeudaPago[];
}

export interface ObraHerramientaDetalleItem {
  id_herramienta: number;
  nombre_herramienta: string;
  cantidad_asignada: number;
  cantidad_devuelta: number;
  cantidad_danada: number;
  cantidad_perdida: number;
  en_obra: number;
}

export interface ObraHerramientaDetalle {
  nombre_obra: string;
  herramientas: ObraHerramientaDetalleItem[];
}

export interface ObraMaterialDetalleItem {
  id_material: number;
  nombre: string;
  codigo?: string | null;
  medida?: string | null;
  id_color: number;
  nombre_color: string;
  codigo_color: string;
  id_categoria: number;
  nombre_categoria: string;
  cantidad_usada: number;
  precio: number;
  costo: number;
  cantidad_devuelta?: ObraMaterialRecicladoCantidadDevuelta[];
}

export interface ObraMaterialDetalle {
  precio_materiales: number;
  precio_mano_obra: number;
  precio_total?: number;
  materiales: ObraMaterialDetalleItem[];
}

export interface ObraMaterialSyncPayload {
  id_obra: number;
  materiales: ObraMaterialPayload[];
}

export interface ObraDeudorObraItem {
  id_obra: number;
  nombre_obra: string;
  saldo: number;
  fecha_pactada: string | null;
}

export interface ObraDeudorClienteItem {
  nombre_cliente: string;
  num_cel: string;
  total_saldo_acumulado: number;
  obras: ObraDeudorObraItem[];
}

export interface ObraMaterialRecicladoCompletosPayload {
  id_material: number;
  cantidad: number;
}

export interface ObraMaterialRecicladoItemPayload {
  id_material: number;
  medida: string;
  cantidad: number;
}

export interface ObraMaterialRecicladosPayload {
  id_obra: number;
  materiales_completos: ObraMaterialRecicladoCompletosPayload[];
  materiales_reciclados: ObraMaterialRecicladoItemPayload[];
}

export interface ObraMaterialRecicladoCantidadDevuelta {
  tipo: string;
  cantidad: number;
  fecha?: string;
  medida?: string;
  id_material_reciclado?: number;
}

export interface ObraMaterialRecicladoCompletoItem {
  id_material: number;
  cantidad: number;
  cantidad_devuelta: ObraMaterialRecicladoCantidadDevuelta[];
}

export interface ObraMaterialRecicladoRecicladoItem {
  id_material_base: number;
  id_material_reciclado: number;
  medida: string;
  cantidad: number;
  cantidad_devuelta: ObraMaterialRecicladoCantidadDevuelta[];
}

export interface ObraMaterialRecicladosResult {
  id_obra: number;
  id_sucursal: number;
  materiales_completos: ObraMaterialRecicladoCompletoItem[];
  materiales_reciclados: ObraMaterialRecicladoRecicladoItem[];
}

export interface ObraHerramientaSyncResult {
  nombre_obra: string;
  herramientas: ObraHerramientaDetalleItem[];
}

export interface ObraHerramientaDevolucionItemResult {
  id_herramienta: number;
  cantidad_asignada: number;
  cantidad_devuelta: number;
  cantidad_danada: number;
  cantidad_perdida: number;
}

export interface ObraHerramientaDevolucionResult {
  id_obra: number;
  id_sucursal: number;
  herramientas: ObraHerramientaDevolucionItemResult[];
}
