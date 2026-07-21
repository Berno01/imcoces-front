import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { SucursalService } from '../shared/sucursal/sucursal.service';
import { VentaMaterialCatalogComponent } from './components/venta-material-catalog.component';
import { VentaMaterialOption, VentaPersisted } from './venta.interfaces';
import { VentaService } from './venta.service';

export interface VentaDraftItem {
  id_material: number;
  codigo: string;
  nombre: string;
  nombre_categoria: string;
  medida: string;
  is_reciclado: boolean | number;
  cantidad: number;
  precio: number;
  costo: number;
}

export type VentaRegisterMode = 'create' | 'edit';

export interface VentaSavedEvent {
  mode: VentaRegisterMode;
  venta: VentaPersisted;
}

@Component({
  selector: 'app-venta-register',
  standalone: true,
  imports: [VentaMaterialCatalogComponent],
  templateUrl: './venta-register.component.html',
})
export class VentaRegisterComponent {
  private readonly ventaService = inject(VentaService);
  private readonly sucursalService = inject(SucursalService);

  private editingVentaIdInternal: number | null = null;

  @Input() mode: VentaRegisterMode = 'create';
  @Input() fixedSucursalId: number | null = null;

  @Input()
  set editingVentaId(value: number | null | undefined) {
    const normalized = this.toNumber(value);
    this.editingVentaIdInternal = normalized > 0 ? normalized : null;
  }

  @Input()
  set initialCliente(value: string | null | undefined) {
    this.cliente.set(this.toText(value));
  }

  @Input()
  set initialTotalQr(value: number | string | null | undefined) {
    this.totalQrAmount.set(this.toMoney(value));
  }

  @Input()
  set initialItems(value: VentaDraftItem[] | null | undefined) {
    const next = (value ?? []).map((item) => ({
      id_material: this.toNumber(item.id_material),
      codigo: this.toText(item.codigo),
      nombre: this.toText(item.nombre),
      nombre_categoria: this.toText(item.nombre_categoria),
      medida: this.toText(item.medida),
      is_reciclado: this.resolveReciclado(item.is_reciclado),
      cantidad: this.normalizeCantidad(item.cantidad, item.is_reciclado),
      precio: this.toMoney(item.precio),
      costo: this.toMoney(item.costo),
    }));

    this.selectedItems.set(next);
  }

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<VentaSavedEvent>();

  readonly cliente = signal('');
  readonly selectedItems = signal<VentaDraftItem[]>([]);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isQrModalOpen = signal(false);
  readonly qrDraftAmount = signal('0.00');
  readonly totalQrAmount = signal(0);

  readonly selectedSucursalId = computed(() => this.sucursalService.selectedSucursalId());

  readonly totalPagar = computed(() =>
    this.selectedItems().reduce((sum, item) => sum + this.getSubtotal(item), 0),
  );

  readonly totalQr = computed(() => {
    const amount = this.toMoney(this.totalQrAmount());
    const total = this.totalPagar();

    if (amount <= 0) {
      return 0;
    }

    if (amount > total) {
      return total;
    }

    return amount;
  });

  readonly totalEfect = computed(() => Math.max(this.totalPagar() - this.totalQr(), 0));
  readonly hasQrPayment = computed(() => this.totalQr() > 0);

  readonly canSubmit = computed(
    () => !this.isSubmitting() && this.selectedItems().length > 0 && this.toText(this.cliente()).length > 0,
  );

  onMaterialAdded(material: VentaMaterialOption): void {
    this.errorMessage.set(null);

    const idMaterial = this.toNumber(material.id_material);
    if (idMaterial <= 0) {
      return;
    }

    this.selectedItems.update((current) => {
      const index = current.findIndex((item) => item.id_material === idMaterial);

      if (index === -1) {
        return [
          ...current,
          {
            id_material: idMaterial,
            codigo: this.toText(material.codigo),
            nombre: this.toText(material.nombre),
            nombre_categoria: this.toText(material.nombre_categoria),
            medida: this.toText(material.medida),
            is_reciclado: this.resolveReciclado(material.is_reciclado),
            cantidad: this.resolveReciclado(material.is_reciclado) ? 1 : 1,
            precio: this.toMoney(material.precio),
            costo: this.toMoney(material.costo),
          },
        ];
      }

      return current.map((item, currentIndex) => {
        if (currentIndex !== index) {
          return item;
        }

        if (this.resolveReciclado(item.is_reciclado)) {
          return {
            ...item,
            cantidad: this.normalizeCantidad(item.cantidad + 0.5, item.is_reciclado),
          };
        }

        return {
          ...item,
          cantidad: this.normalizeCantidad(item.cantidad + 1, item.is_reciclado),
        };
      });
    });
  }

  updateCliente(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.cliente.set(target.value);
  }

  updatePrecio(idMaterial: number, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const value = this.toMoney(input.value);

    this.selectedItems.update((current) =>
      current.map((item) =>
        item.id_material === idMaterial
          ? {
              ...item,
              precio: value > 0 ? value : 0,
            }
          : item,
      ),
    );
  }

  increaseCantidad(item: VentaDraftItem): void {
    this.selectedItems.update((current) =>
      current.map((target) => {
        if (target.id_material !== item.id_material) {
          return target;
        }

        return {
          ...target,
          cantidad: this.normalizeCantidad(target.cantidad + 1, target.is_reciclado),
        };
      }),
    );
  }

  decreaseCantidad(item: VentaDraftItem): void {
    this.selectedItems.update((current) =>
      current.map((target) => {
        if (target.id_material !== item.id_material) {
          return target;
        }

        const next = target.cantidad - 1;

        return {
          ...target,
          cantidad: this.normalizeCantidad(next, target.is_reciclado),
        };
      }),
    );
  }

  updateRecicladoCantidad(idMaterial: number, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const value = this.toMoney(input.value);

    this.selectedItems.update((current) =>
      current.map((item) =>
        item.id_material === idMaterial
          ? {
              ...item,
              cantidad: this.normalizeCantidad(value, item.is_reciclado),
            }
          : item,
      ),
    );
  }

  removeItem(idMaterial: number): void {
    this.selectedItems.update((current) => current.filter((item) => item.id_material !== idMaterial));
  }

  getSubtotal(item: VentaDraftItem): number {
    return this.toMoney(item.cantidad * item.precio);
  }

  openQrModal(): void {
    if (this.totalPagar() <= 0) {
      return;
    }

    this.qrDraftAmount.set(this.totalQr().toFixed(2));
    this.isQrModalOpen.set(true);
  }

  closeQrModal(): void {
    this.isQrModalOpen.set(false);
  }

  onQrInputChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.qrDraftAmount.set(target.value);
  }

  applyQrAmount(): void {
    const parsed = this.toMoney(this.qrDraftAmount());
    const total = this.totalPagar();

    if (parsed > total) {
      this.errorMessage.set('El monto en QR/Transferencia no puede ser mayor al total a pagar.');
      return;
    }

    this.errorMessage.set(null);
    this.totalQrAmount.set(parsed);
    this.closeQrModal();
  }

  clearQrAmount(): void {
    this.totalQrAmount.set(0);
    this.qrDraftAmount.set('0.00');
  }

  submitVenta(): void {
    this.errorMessage.set(null);

    const cliente = this.toText(this.cliente());
    if (!cliente) {
      this.errorMessage.set('Debe ingresar el nombre del cliente.');
      return;
    }

    if (this.selectedItems().length === 0) {
      this.errorMessage.set('Debe agregar al menos un material para registrar la venta.');
      return;
    }

    const idSucursal = this.resolveTargetSucursalId();
    if (idSucursal <= 0) {
      this.errorMessage.set('Seleccione una sucursal especifica en el navbar para registrar la venta.');
      return;
    }

    const payload = {
      total_qr: this.totalQr(),
      cliente,
      id_sucursal: idSucursal,
      detalles: this.selectedItems().map((item) => ({
        id_material: this.toNumber(item.id_material),
        cantidad: this.normalizeCantidad(item.cantidad, item.is_reciclado),
        precio: this.toMoney(item.precio),
        costo: this.toMoney(item.costo),
      })),
    };

    const isEdit = this.mode === 'edit' && this.editingVentaIdInternal;

    this.isSubmitting.set(true);

    const request$ = isEdit
      ? this.ventaService.updateVenta({
          id_venta: this.editingVentaIdInternal!,
          ...payload,
        })
      : this.ventaService.createVenta(payload);

    request$
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.saved.emit({
            mode: this.mode,
            venta: response.data,
          });
        },
        error: () => {
          this.errorMessage.set(
            isEdit
              ? 'No se pudo modificar la venta. Verifique cantidades y stock disponible.'
              : 'No se pudo registrar la venta. Verifique cantidades y stock disponible.',
          );
        },
      });
  }

  cancelForm(): void {
    this.cancel.emit();
  }

  isReciclado(item: VentaDraftItem): boolean {
    return this.resolveReciclado(item.is_reciclado);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toMoney(value));
  }

  getPanelTitle(): string {
    if (this.mode === 'edit') {
      return this.editingVentaIdInternal
        ? `Modificar Venta #${this.editingVentaIdInternal}`
        : 'Modificar Venta';
    }

    return 'Nueva Venta';
  }

  getSubmitLabel(): string {
    if (this.isSubmitting()) {
      return this.mode === 'edit' ? 'MODIFICANDO VENTA...' : 'REGISTRANDO VENTA...';
    }

    return this.mode === 'edit' ? 'MODIFICAR VENTA' : 'REGISTRAR VENTA';
  }

  trackByItem(_index: number, item: VentaDraftItem): number {
    return item.id_material;
  }

  private normalizeCantidad(value: number, isReciclado: unknown): number {
    const cantidad = this.toMoney(value);

    if (this.resolveReciclado(isReciclado)) {
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

  private resolveTargetSucursalId(): number {
    const fixed = this.toNumber(this.fixedSucursalId);
    if (fixed > 0) {
      return fixed;
    }

    return this.toNumber(this.selectedSucursalId());
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private toMoney(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Number(parsed.toFixed(2));
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
