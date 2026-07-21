import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { finalize, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IngresoDetalle, IngresoResumen } from './ingreso.interfaces';
import { IngresoHistoryComponent } from './ingreso-history.component';
import {
  IngresoDraftItem,
  IngresoRegisterComponent,
  IngresoSavedEvent,
} from './ingreso-register.component';
import { IngresoService } from './ingreso.service';
import { MaterialService } from '../materiales/material.service';

type IngresoViewMode = 'history' | 'form';
type ToastKind = 'success' | 'error';

interface ToastState {
  kind: ToastKind;
  message: string;
}

@Component({
  selector: 'app-ingreso-flow',
  standalone: true,
  imports: [IngresoHistoryComponent, IngresoRegisterComponent],
  templateUrl: './ingreso-flow.component.html',
})
export class IngresoFlowComponent {
  private readonly ingresoService = inject(IngresoService);
  private readonly materialService = inject(MaterialService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(IngresoHistoryComponent)
  private readonly historyComponent?: IngresoHistoryComponent;

  readonly viewMode = signal<IngresoViewMode>('history');
  readonly registerMode = signal<'create' | 'edit'>('create');
  readonly draftItems = signal<IngresoDraftItem[]>([]);
  readonly editingIngresoId = signal<number | null>(null);
  readonly fixedSucursalId = signal<number | null>(null);
  readonly loadingEditData = signal(false);
  readonly deletingIngresoId = signal<number | null>(null);
  readonly toast = signal<ToastState | null>(null);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private codigoByMaterialId: Record<number, string> = {};

  openCreateForm(): void {
    this.registerMode.set('create');
    this.editingIngresoId.set(null);
    this.fixedSucursalId.set(null);
    this.draftItems.set([]);
    this.viewMode.set('form');
  }

  openEditForm(ingreso: IngresoResumen): void {
    this.loadingEditData.set(true);

    Promise.all([
      firstValueFrom(this.ingresoService.getIngresoDetalle(ingreso.id_ingreso)),
      this.loadCodigoByMaterialId(),
    ])
      .then(([detalleResponse]) => {
        this.registerMode.set('edit');
        this.editingIngresoId.set(ingreso.id_ingreso);
        this.fixedSucursalId.set(this.toSafeNumber(ingreso.id_sucursal));
        this.draftItems.set(this.mapDetalleToDraftItems(detalleResponse.data ?? []));
        this.viewMode.set('form');
      })
      .catch(() => {
        this.showToast({
          kind: 'error',
          message: 'No se pudo cargar el detalle para editar el ingreso.',
        });
      })
      .finally(() => {
        this.loadingEditData.set(false);
      });
  }

  deleteIngreso(ingreso: IngresoResumen): void {
    const shouldDelete = confirm(
      `Se eliminara el ingreso #${ingreso.id_ingreso}. Esta accion no se puede deshacer.\n\nDesea continuar?`,
    );

    if (!shouldDelete) {
      return;
    }

    const idIngreso = this.toSafeNumber(ingreso.id_ingreso);
    if (idIngreso <= 0) {
      this.showToast({
        kind: 'error',
        message: 'No se encontro un id de ingreso valido para eliminar.',
      });
      return;
    }

    this.deletingIngresoId.set(idIngreso);

    this.ingresoService
      .desactivarIngreso(idIngreso)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingIngresoId.set(null)),
      )
      .subscribe({
        next: () => {
          this.showToast({ kind: 'success', message: 'Ingreso eliminado correctamente.' });
          this.historyComponent?.reloadHistory();
        },
        error: () => {
          this.showToast({ kind: 'error', message: 'No se pudo eliminar el ingreso.' });
        },
      });
  }

  returnToHistory(): void {
    this.viewMode.set('history');
    this.registerMode.set('create');
    this.editingIngresoId.set(null);
    this.fixedSucursalId.set(null);
    this.draftItems.set([]);
    this.historyComponent?.reloadHistory();
  }

  handleSaved(event: IngresoSavedEvent): void {
    const message =
      event.mode === 'edit'
        ? 'Ingreso actualizado correctamente.'
        : 'Ingreso registrado correctamente.';

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

  private mapDetalleToDraftItems(detalle: IngresoDetalle[]): IngresoDraftItem[] {
    return detalle.map((item) => {
      const materialId = this.toSafeNumber(item.id_material);

      return {
        id_material: materialId,
        codigo: this.resolveCodigo(item, materialId),
        nombre: item.nombre,
        cantidad: this.normalizePositiveInteger(item.cantidad),
        costo_unitario: this.normalizePositiveDecimal(item.costo_unitario),
      };
    });
  }

  private async loadCodigoByMaterialId(): Promise<void> {
    const response = await firstValueFrom(this.materialService.getMateriales());
    const map: Record<number, string> = {};

    for (const material of response.data ?? []) {
      const id = this.toSafeNumber(material.id_material);
      const codigo = (material.codigo ?? '').trim();
      if (id > 0 && codigo.length > 0) {
        map[id] = codigo;
      }
    }

    this.codigoByMaterialId = map;
  }

  private resolveCodigo(item: IngresoDetalle, materialId: number): string {
    if (typeof item.codigo === 'string' && item.codigo.trim().length > 0) {
      return item.codigo.trim();
    }

    return this.codigoByMaterialId[materialId] ?? '';
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
}
