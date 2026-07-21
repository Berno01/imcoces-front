import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';

import { VentaHistoryComponent } from './venta-history.component';
import {
  VentaDraftItem,
  VentaRegisterComponent,
  VentaSavedEvent,
} from './venta-register.component';
import { VentaDetalleItem, VentaMaterialOption, VentaResumen } from './venta.interfaces';
import { VentaService } from './venta.service';

type VentaViewMode = 'history' | 'form';
type ToastKind = 'success' | 'error';

interface ToastState {
  kind: ToastKind;
  message: string;
}

@Component({
  selector: 'app-venta-flow',
  standalone: true,
  imports: [VentaHistoryComponent, VentaRegisterComponent],
  templateUrl: './venta-flow.component.html',
})
export class VentaFlowComponent {
  private readonly ventaService = inject(VentaService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(VentaHistoryComponent)
  private readonly historyComponent?: VentaHistoryComponent;

  readonly viewMode = signal<VentaViewMode>('history');
  readonly registerMode = signal<'create' | 'edit'>('create');
  readonly editingVentaId = signal<number | null>(null);
  readonly fixedSucursalId = signal<number | null>(null);
  readonly initialCliente = signal('');
  readonly initialTotalQr = signal(0);
  readonly draftItems = signal<VentaDraftItem[]>([]);
  readonly loadingEditData = signal(false);

  readonly toast = signal<ToastState | null>(null);
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  openCreateForm(): void {
    this.registerMode.set('create');
    this.editingVentaId.set(null);
    this.fixedSucursalId.set(null);
    this.initialCliente.set('');
    this.initialTotalQr.set(0);
    this.draftItems.set([]);
    this.viewMode.set('form');
  }

  openEditForm(venta: VentaResumen): void {
    const idVenta = this.toSafeNumber(venta.id_venta);
    if (idVenta <= 0) {
      this.showToast({
        kind: 'error',
        message: 'No se encontro un id de venta valido para editar.',
      });
      return;
    }

    const idSucursal = this.toSafeNumber(venta.id_sucursal);
    if (idSucursal <= 0) {
      this.showToast({
        kind: 'error',
        message: 'No se encontro una sucursal valida para cargar la venta.',
      });
      return;
    }

    this.loadingEditData.set(true);

    forkJoin({
      detalle: this.ventaService.getVentaDetalle(idVenta),
      materiales: this.ventaService.getVentaMateriales(idSucursal),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingEditData.set(false)),
      )
      .subscribe({
        next: ({ detalle, materiales }) => {
          const detalleItems = detalle.data ?? [];
          const materialOptions = materiales.data ?? [];

          this.registerMode.set('edit');
          this.editingVentaId.set(idVenta);
          this.fixedSucursalId.set(idSucursal);
          this.initialCliente.set(this.resolveCliente(detalleItems, venta));
          this.initialTotalQr.set(this.resolveTotalQr(detalleItems, venta));
          this.draftItems.set(this.mapDetalleToDraftItems(detalleItems, materialOptions));
          this.viewMode.set('form');
        },
        error: () => {
          this.showToast({
            kind: 'error',
            message: 'No se pudo cargar el detalle para editar la venta.',
          });
        },
      });
  }

  returnToHistory(): void {
    this.viewMode.set('history');
    this.registerMode.set('create');
    this.editingVentaId.set(null);
    this.fixedSucursalId.set(null);
    this.initialCliente.set('');
    this.initialTotalQr.set(0);
    this.draftItems.set([]);
    this.historyComponent?.reloadHistory();
  }

  handleSaved(event: VentaSavedEvent): void {
    const message =
      event.mode === 'edit' ? 'Venta modificada correctamente.' : 'Venta registrada correctamente.';

    this.showToast({ kind: 'success', message });
    this.returnToHistory();
  }

  clearToast(): void {
    this.toast.set(null);

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private mapDetalleToDraftItems(
    detalle: VentaDetalleItem[],
    materialOptions: VentaMaterialOption[],
  ): VentaDraftItem[] {
    const materialMap = new Map<number, VentaMaterialOption>(
      materialOptions.map((item) => [this.toSafeNumber(item.id_material), item]),
    );

    return detalle.map((item) => {
      const idMaterial = this.toSafeNumber(item.id_material);
      const material = materialMap.get(idMaterial);
      const isReciclado = material?.is_reciclado ?? false;

      return {
        id_material: idMaterial,
        codigo: this.toText(material?.codigo) || `MAT-${idMaterial}`,
        nombre: this.toText(material?.nombre) || `Material #${idMaterial}`,
        nombre_categoria: this.toText(material?.nombre_categoria),
        medida: this.toText(material?.medida),
        is_reciclado: isReciclado,
        cantidad: this.normalizeCantidad(item.cantidad, isReciclado),
        precio: this.normalizeMoney(item.precio),
        costo: this.normalizeMoney(item.costo),
      };
    });
  }

  private resolveCliente(detalle: VentaDetalleItem[], venta: VentaResumen): string {
    const fromDetalle = this.toText(detalle[0]?.cliente);
    if (fromDetalle) {
      return fromDetalle;
    }

    return this.toText(venta.cliente);
  }

  private resolveTotalQr(detalle: VentaDetalleItem[], venta: VentaResumen): number {
    const fromDetalle = this.toSafeNumber(detalle[0]?.total_qr);
    if (fromDetalle > 0) {
      return this.normalizeMoney(fromDetalle);
    }

    return this.normalizeMoney(venta.total_qr);
  }

  private normalizeCantidad(value: unknown, isReciclado: unknown): number {
    const cantidad = this.toSafeNumber(value);
    const recycled = this.resolveReciclado(isReciclado);

    if (recycled) {
      if (cantidad <= 0) {
        return 0.01;
      }

      return Number(cantidad.toFixed(2));
    }

    const integer = Math.floor(cantidad);
    return integer > 0 ? integer : 1;
  }

  private resolveReciclado(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true';
    }

    return false;
  }

  private normalizeMoney(value: unknown): number {
    const amount = this.toSafeNumber(value);
    if (amount <= 0) {
      return 0;
    }

    return Number(amount.toFixed(2));
  }

  private showToast(toast: ToastState): void {
    this.toast.set(toast);

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.toast.set(null);
      this.toastTimeoutId = null;
    }, 3200);
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
