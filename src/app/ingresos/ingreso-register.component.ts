import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';

import { SucursalService } from '../shared/sucursal/sucursal.service';
import { IngresoMaterialOption } from './ingreso.interfaces';
import { IngresoMaterialCatalogComponent } from './ingreso-material-catalog.component';
import { IngresoService } from './ingreso.service';

export interface IngresoDraftItem {
  id_material: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
}

export type IngresoRegisterMode = 'create' | 'edit';

export interface IngresoSavedEvent {
  mode: IngresoRegisterMode;
  id_ingreso?: number;
}

@Component({
  selector: 'app-ingreso-register',
  standalone: true,
  imports: [IngresoMaterialCatalogComponent],
  templateUrl: './ingreso-register.component.html',
})
export class IngresoRegisterComponent {
  private readonly ingresoService = inject(IngresoService);
  private readonly sucursalService = inject(SucursalService);

  private editingIngresoIdInternal: number | null = null;

  @ViewChild(IngresoMaterialCatalogComponent)
  private readonly materialCatalog?: IngresoMaterialCatalogComponent;

  @Input() mode: IngresoRegisterMode = 'create';

  @Input()
  set initialItems(value: IngresoDraftItem[] | null | undefined) {
    const next = (value ?? []).map((item) => ({
      id_material: this.toSafeNumber(item.id_material),
      codigo: item.codigo,
      nombre: item.nombre,
      cantidad: this.normalizePositiveInteger(item.cantidad),
      costo_unitario: this.normalizePositiveDecimal(item.costo_unitario),
    }));

    this.selectedItems.set(next);
  }

  @Input()
  set editingIngresoId(value: number | null | undefined) {
    const normalized = this.toSafeNumber(value);
    this.editingIngresoIdInternal = normalized > 0 ? normalized : null;
  }

  @Input() fixedSucursalId: number | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<IngresoSavedEvent>();

  readonly selectedItems = signal<IngresoDraftItem[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly totalUnidades = computed(() =>
    this.selectedItems().reduce((sum, item) => sum + this.toSafeNumber(item.cantidad), 0),
  );
  readonly totalMonto = computed(() =>
    this.selectedItems().reduce(
      (sum, item) =>
        sum + this.toSafeNumber(item.cantidad) * this.toSafeNumber(item.costo_unitario),
      0,
    ),
  );

  onMaterialAdded(material: IngresoMaterialOption): void {
    const idMaterial = this.toSafeNumber(material.id_material);
    if (idMaterial <= 0) {
      return;
    }

    this.errorMessage.set(null);

    this.selectedItems.update((current) => {
      const index = current.findIndex((item) => item.id_material === idMaterial);
      if (index === -1) {
        return [
          ...current,
          {
            id_material: idMaterial,
            codigo: material.codigo,
            nombre: material.nombre,
            cantidad: 1,
            costo_unitario: this.defaultCosto(material),
          },
        ];
      }

      return current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              cantidad: this.normalizePositiveInteger(item.cantidad + 1),
            }
          : item,
      );
    });
  }

  updateCantidad(idMaterial: number, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const value = this.normalizePositiveInteger(input.value);
    this.selectedItems.update((current) =>
      current.map((item) =>
        item.id_material === idMaterial
          ? {
              ...item,
              cantidad: value,
            }
          : item,
      ),
    );
  }

  updateCosto(idMaterial: number, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const value = this.normalizePositiveDecimal(input.value);
    this.selectedItems.update((current) =>
      current.map((item) =>
        item.id_material === idMaterial
          ? {
              ...item,
              costo_unitario: value,
            }
          : item,
      ),
    );
  }

  removeItem(idMaterial: number): void {
    this.selectedItems.update((current) =>
      current.filter((item) => item.id_material !== idMaterial),
    );
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toSafeNumber(value));
  }

  getSubtotal(item: IngresoDraftItem): number {
    return this.toSafeNumber(item.cantidad) * this.toSafeNumber(item.costo_unitario);
  }

  confirmIngreso(): void {
    this.errorMessage.set(null);

    if (this.selectedItems().length === 0) {
      this.errorMessage.set('Debe agregar al menos un material para confirmar el ingreso.');
      return;
    }

    const idSucursal = this.resolveTargetSucursalId();
    if (idSucursal <= 0) {
      this.errorMessage.set(
        'Seleccione una sucursal especifica en la barra superior para registrar el ingreso.',
      );
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      id_sucursal: idSucursal,
      detalle_ingreso: this.selectedItems().map((item) => ({
        id_material: item.id_material,
        cantidad: this.normalizePositiveInteger(item.cantidad),
        costo_unitario: this.normalizePositiveDecimal(item.costo_unitario),
      })),
    };

    const request$ =
      this.mode === 'edit' && this.editingIngresoIdInternal
        ? this.ingresoService.updateIngreso({
            id_ingreso: this.editingIngresoIdInternal,
            ...payload,
          })
        : this.ingresoService.createIngreso(payload);

    request$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (response) => {
        this.materialCatalog?.reloadCatalog();
        this.saved.emit({
          mode: this.mode,
          id_ingreso: response.data?.id_ingreso,
        });
      },
      error: () => {
        this.errorMessage.set(
          this.mode === 'edit'
            ? 'No se pudo actualizar el ingreso. Intente nuevamente.'
            : 'No se pudo registrar el ingreso. Intente nuevamente.',
        );
      },
    });
  }

  cancelForm(): void {
    this.cancel.emit();
  }

  getPanelTitle(): string {
    if (this.mode === 'edit') {
      return this.editingIngresoIdInternal
        ? `Editar Ingreso #${this.editingIngresoIdInternal}`
        : 'Editar Ingreso';
    }

    return 'Nuevo Ingreso';
  }

  getConfirmButtonText(): string {
    if (this.isSubmitting()) {
      return this.mode === 'edit' ? 'Actualizando...' : 'Confirmando...';
    }

    return this.mode === 'edit'
      ? 'Guardar Cambios del Ingreso'
      : 'Confirmar Orden de Registro de Ingreso';
  }

  trackByItem(_index: number, item: IngresoDraftItem): number {
    return item.id_material;
  }

  private defaultCosto(material: IngresoMaterialOption): number {
    const value = this.toSafeNumber(material.costo_unitario);
    if (value > 0) {
      return value;
    }

    const fallback = this.toSafeNumber(material.precio);
    return fallback > 0 ? fallback : 1;
  }

  private normalizePositiveInteger(value: unknown): number {
    const parsed = Math.floor(this.toSafeNumber(value));
    return parsed > 0 ? parsed : 1;
  }

  private normalizePositiveDecimal(value: unknown): number {
    const parsed = this.toSafeNumber(value);
    return parsed > 0 ? parsed : 0.01;
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private resolveTargetSucursalId(): number {
    const fixed = this.toSafeNumber(this.fixedSucursalId);
    if (fixed > 0) {
      return fixed;
    }

    return this.toSafeNumber(this.sucursalService.selectedSucursalId());
  }
}
