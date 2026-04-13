import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IngresoDetalle, IngresoListFilters, IngresoResumen } from './ingreso.interfaces';
import { IngresoService } from './ingreso.service';
import { SucursalService } from '../shared/sucursal/sucursal.service';

@Component({
  selector: 'app-ingreso-history',
  standalone: true,
  templateUrl: './ingreso-history.component.html',
})
export class IngresoHistoryComponent {
  private readonly ingresoService = inject(IngresoService);
  private readonly sucursalService = inject(SucursalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ingresos = signal<IngresoResumen[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly expandedIngresoId = signal<number | null>(null);
  readonly detalleByIngreso = signal<Record<number, IngresoDetalle[]>>({});
  readonly loadingDetalleIds = signal<Set<number>>(new Set<number>());
  readonly detalleErrorByIngreso = signal<Record<number, string>>({});
  readonly refreshTick = signal(0);

  @Output() readonly createRequested = new EventEmitter<void>();
  @Output() readonly editRequested = new EventEmitter<IngresoResumen>();
  @Output() readonly deleteRequested = new EventEmitter<IngresoResumen>();

  private readonly boliviaToday = this.getTodayBoliviaDate();

  readonly filterMode = signal<'single' | 'range'>('single');
  readonly singleDate = signal(this.boliviaToday);
  readonly rangeStartDate = signal(this.boliviaToday);
  readonly rangeEndDate = signal(this.boliviaToday);

  readonly selectedSucursalId = computed(() => this.sucursalService.selectedSucursalId());
  readonly selectedSucursalName = computed(
    () => this.sucursalService.selectedSucursal()?.nombre ?? 'Todas las sucursales',
  );
  readonly normalizedRange = computed(() =>
    this.normalizeDateRange(this.rangeStartDate(), this.rangeEndDate()),
  );
  readonly fechaInicio = computed(() =>
    this.filterMode() === 'range' ? this.normalizedRange().start : this.singleDate(),
  );
  readonly fechaFin = computed(() =>
    this.filterMode() === 'range' ? this.normalizedRange().end : this.singleDate(),
  );
  readonly filtroFechaLabel = computed(() => {
    if (this.filterMode() === 'range') {
      return `${this.normalizedRange().start} a ${this.normalizedRange().end}`;
    }

    return this.singleDate();
  });

  constructor() {
    effect(() => {
      this.refreshTick();

      const filters: IngresoListFilters = {
        id_sucursal: this.selectedSucursalId(),
        fecha_inicio: this.fechaInicio(),
        fecha_fin: this.fechaFin(),
      };

      this.loadIngresos(filters);
    });
  }

  requestCreate(): void {
    this.createRequested.emit();
  }

  requestEdit(ingreso: IngresoResumen): void {
    this.editRequested.emit(ingreso);
  }

  requestDelete(ingreso: IngresoResumen): void {
    this.deleteRequested.emit(ingreso);
  }

  reloadHistory(): void {
    this.refreshTick.update((value) => value + 1);
  }

  toggleRangeMode(): void {
    if (this.filterMode() === 'range') {
      this.singleDate.set(this.normalizedRange().start);
      this.filterMode.set('single');
      return;
    }

    this.rangeStartDate.set(this.singleDate());
    this.rangeEndDate.set(this.singleDate());
    this.filterMode.set('range');
  }

  onSingleDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.singleDate.set(target.value);
  }

  onRangeStartDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.rangeStartDate.set(target.value);
  }

  onRangeEndDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.rangeEndDate.set(target.value);
  }

  setTodayBolivia(): void {
    this.singleDate.set(this.boliviaToday);
    this.rangeStartDate.set(this.boliviaToday);
    this.rangeEndDate.set(this.boliviaToday);
  }

  trackByIngreso(_index: number, ingreso: IngresoResumen): number {
    return ingreso.id_ingreso;
  }

  trackByDetalle(_index: number, detalle: IngresoDetalle): number {
    return detalle.id_detalle_ingreso;
  }

  toggleDetalle(ingreso: IngresoResumen): void {
    const idIngreso = ingreso.id_ingreso;

    if (this.expandedIngresoId() === idIngreso) {
      this.expandedIngresoId.set(null);
      return;
    }

    this.expandedIngresoId.set(idIngreso);

    if (this.getIngresoDetalleById(idIngreso).length > 0 || this.isDetalleLoading(idIngreso)) {
      return;
    }

    this.loadIngresoDetalle(idIngreso);
  }

  isIngresoExpanded(idIngreso: number): boolean {
    return this.expandedIngresoId() === idIngreso;
  }

  isDetalleLoading(idIngreso: number): boolean {
    return this.loadingDetalleIds().has(idIngreso);
  }

  getIngresoDetalleById(idIngreso: number): IngresoDetalle[] {
    return this.detalleByIngreso()[idIngreso] ?? [];
  }

  getDetalleErrorById(idIngreso: number): string | null {
    return this.detalleErrorByIngreso()[idIngreso] ?? null;
  }

  formatCantidadMateriales(value: number | string): string {
    const cantidad = Number(value);

    if (!Number.isFinite(cantidad)) {
      return '0 Items';
    }

    return `${cantidad.toString().padStart(2, '0')} Items`;
  }

  formatFecha(value: string): string {
    const date = this.parseIngresoDate(value);

    if (!date) {
      return value;
    }

    return new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatHora(value: string): string {
    const date = this.parseIngresoDate(value);

    if (!date) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  formatTotal(value: number): string {
    const total = Number(value);

    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(total) ? total : 0);
  }

  formatCostoUnitario(value: number): string {
    const costo = Number(value);

    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(costo) ? costo : 0);
  }

  viewDetalle(_ingreso: IngresoResumen): void {
    // Placeholder para proxima iteracion del detalle.
  }

  private loadIngresos(filters: IngresoListFilters): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.ingresoService
      .getIngresos(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.ingresos.set(response.data ?? []);
          this.expandedIngresoId.set(null);
        },
        error: () => {
          this.ingresos.set([]);
          this.expandedIngresoId.set(null);
          this.errorMessage.set('No se pudo cargar el historial de ingresos.');
        },
      });
  }

  private loadIngresoDetalle(idIngreso: number): void {
    this.loadingDetalleIds.update((current) => {
      const next = new Set(current);
      next.add(idIngreso);
      return next;
    });

    this.detalleErrorByIngreso.update((current) => {
      const next = { ...current };
      delete next[idIngreso];
      return next;
    });

    this.ingresoService
      .getIngresoDetalle(idIngreso)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadingDetalleIds.update((current) => {
            const next = new Set(current);
            next.delete(idIngreso);
            return next;
          });
        }),
      )
      .subscribe({
        next: (response) => {
          this.detalleByIngreso.update((current) => ({
            ...current,
            [idIngreso]: response.data ?? [],
          }));
        },
        error: () => {
          this.detalleErrorByIngreso.update((current) => ({
            ...current,
            [idIngreso]: 'No se pudo cargar el detalle del ingreso.',
          }));
        },
      });
  }

  private parseIngresoDate(value: string): Date | null {
    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeDateRange(startDate: string, endDate: string): { start: string; end: string } {
    if (!startDate && !endDate) {
      return { start: this.boliviaToday, end: this.boliviaToday };
    }

    if (!startDate) {
      return { start: endDate, end: endDate };
    }

    if (!endDate) {
      return { start: startDate, end: startDate };
    }

    return startDate <= endDate
      ? { start: startDate, end: endDate }
      : { start: endDate, end: startDate };
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
