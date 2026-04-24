import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { SucursalService } from '../shared/sucursal/sucursal.service';
import {
  VentaDateFilterChange,
  VentaDateFilterComponent,
} from './components/venta-date-filter.component';
import { VentaSummaryTableComponent } from './components/venta-summary-table.component';
import { VentaListFilters, VentaResumen } from './venta.interfaces';
import { VentaService } from './venta.service';

@Component({
  selector: 'app-venta-history',
  standalone: true,
  imports: [VentaDateFilterComponent, VentaSummaryTableComponent],
  templateUrl: './venta-history.component.html',
})
export class VentaHistoryComponent {
    @Output() readonly createRequested = new EventEmitter<void>();
    @Output() readonly editRequested = new EventEmitter<VentaResumen>();

  private readonly ventaService = inject(VentaService);
  private readonly sucursalService = inject(SucursalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ventas = signal<VentaResumen[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly deletingVentaIds = signal<Set<number>>(new Set<number>());
  readonly refreshTick = signal(0);

  readonly fechaInicio = signal(this.getTodayBoliviaDate());
  readonly fechaFin = signal(this.getTodayBoliviaDate());
  readonly filterMode = signal<'single' | 'range'>('single');

  readonly selectedSucursalId = computed(() => this.sucursalService.selectedSucursalId());
  readonly selectedSucursalName = computed(
    () => this.sucursalService.selectedSucursal()?.nombre ?? 'Todas las sucursales',
  );

  constructor() {
    effect(() => {
      this.refreshTick();

      const filters: VentaListFilters = {
        fecha_inicio: this.fechaInicio(),
        fecha_fin: this.fechaFin(),
      };

      const idSucursal = this.selectedSucursalId();
      if (idSucursal > 0) {
        filters.id_sucursal = idSucursal;
      }

      this.loadVentas(filters);
    });
  }

  onDateFiltersChange(filters: VentaDateFilterChange): void {
    this.fechaInicio.set(filters.fecha_inicio);
    this.fechaFin.set(filters.fecha_fin);
    this.filterMode.set(filters.mode);
  }

  onCreateVenta(): void {
    this.errorMessage.set(null);
    this.createRequested.emit();
  }

  onEditVenta(venta: VentaResumen): void {
    const idVenta = this.resolveVentaId(venta);

    if (idVenta <= 0) {
      this.errorMessage.set(
        'No se puede editar porque el listado no incluye id_venta. Ajustaremos el endpoint para incluirlo.',
      );
      return;
    }

    this.errorMessage.set(null);
    this.editRequested.emit(venta);
  }

  onDeleteVenta(venta: VentaResumen): void {
    const idVenta = this.resolveVentaId(venta);

    if (idVenta <= 0) {
      this.errorMessage.set(
        'No se puede eliminar porque el listado no incluye id_venta. Ajustaremos el endpoint para incluirlo.',
      );
      return;
    }

    if (this.deletingVentaIds().has(idVenta)) {
      return;
    }

    const confirmed = window.confirm('Se anulara esta venta. Desea continuar?');
    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.deletingVentaIds.update((current) => {
      const next = new Set(current);
      next.add(idVenta);
      return next;
    });

    this.ventaService
      .deleteVenta(idVenta)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deletingVentaIds.update((current) => {
            const next = new Set(current);
            next.delete(idVenta);
            return next;
          });
        }),
      )
      .subscribe({
        next: () => this.reload(),
        error: () => {
          this.errorMessage.set('No se pudo anular la venta.');
        },
      });
  }

  private loadVentas(filters: VentaListFilters): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ventaService
      .getVentas(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.ventas.set(response.data ?? []);
        },
        error: () => {
          this.ventas.set([]);
          this.errorMessage.set('No se pudo cargar el resumen de ventas.');
        },
      });
  }

  reloadHistory(): void {
    this.reload();
  }

  private reload(): void {
    this.refreshTick.update((value) => value + 1);
  }

  private resolveVentaId(venta: VentaResumen): number {
    const parsed = Number(venta.id_venta);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getTodayBoliviaDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';

    return `${year}-${month}-${day}`;
  }
}
