import { Component, EventEmitter, Output, computed, signal } from '@angular/core';

export interface VentaDateFilterChange {
  fecha_inicio: string;
  fecha_fin: string;
  mode: 'single' | 'range';
}

@Component({
  selector: 'app-venta-date-filter',
  standalone: true,
  templateUrl: './venta-date-filter.component.html',
})
export class VentaDateFilterComponent {
  readonly filterMode = signal<'single' | 'range'>('single');

  readonly singleDate = signal(this.getTodayBoliviaDate());
  readonly rangeStartDate = signal(this.getTodayBoliviaDate());
  readonly rangeEndDate = signal(this.getTodayBoliviaDate());

  readonly normalizedRange = computed(() =>
    this.normalizeDateRange(this.rangeStartDate(), this.rangeEndDate()),
  );

  @Output() readonly filtersChange = new EventEmitter<VentaDateFilterChange>();

  constructor() {
    queueMicrotask(() => this.emitFilters());
  }

  toggleRangeMode(): void {
    if (this.filterMode() === 'range') {
      this.singleDate.set(this.normalizedRange().start);
      this.filterMode.set('single');
      this.emitFilters();
      return;
    }

    this.rangeStartDate.set(this.singleDate());
    this.rangeEndDate.set(this.singleDate());
    this.filterMode.set('range');
    this.emitFilters();
  }

  onSingleDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.singleDate.set(target.value);
    this.emitFilters();
  }

  onRangeStartDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.rangeStartDate.set(target.value);
    this.emitFilters();
  }

  onRangeEndDateChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.value) {
      return;
    }

    this.rangeEndDate.set(target.value);
    this.emitFilters();
  }

  setTodayBolivia(): void {
    const today = this.getTodayBoliviaDate();
    this.singleDate.set(today);
    this.rangeStartDate.set(today);
    this.rangeEndDate.set(today);
    this.emitFilters();
  }

  private emitFilters(): void {
    if (this.filterMode() === 'range') {
      const range = this.normalizedRange();
      this.filtersChange.emit({
        fecha_inicio: range.start,
        fecha_fin: range.end,
        mode: 'range',
      });

      return;
    }

    const date = this.singleDate();

    this.filtersChange.emit({
      fecha_inicio: date,
      fecha_fin: date,
      mode: 'single',
    });
  }

  private normalizeDateRange(startDate: string, endDate: string): { start: string; end: string } {
    if (!startDate && !endDate) {
      const today = this.getTodayBoliviaDate();
      return { start: today, end: today };
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
