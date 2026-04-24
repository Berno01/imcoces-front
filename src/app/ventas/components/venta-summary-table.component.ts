import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';

import { VentaResumen } from '../venta.interfaces';

@Component({
  selector: 'app-venta-summary-table',
  standalone: true,
  templateUrl: './venta-summary-table.component.html',
})
export class VentaSummaryTableComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() ventas: VentaResumen[] = [];
  @Input() isLoading = false;
  @Input() deletingVentaIds = new Set<number>();

  @Output() readonly editRequested = new EventEmitter<VentaResumen>();
  @Output() readonly deleteRequested = new EventEmitter<VentaResumen>();

  openMenuRowId: string | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.openMenuRowId = null;
    }
  }

  toggleMenu(venta: VentaResumen, index: number): void {
    const rowId = this.resolveRowId(venta, index);
    this.openMenuRowId = this.openMenuRowId === rowId ? null : rowId;
  }

  isMenuOpen(venta: VentaResumen, index: number): boolean {
    return this.openMenuRowId === this.resolveRowId(venta, index);
  }

  onEdit(venta: VentaResumen): void {
    this.openMenuRowId = null;
    this.editRequested.emit(venta);
  }

  onDelete(venta: VentaResumen): void {
    this.openMenuRowId = null;
    this.deleteRequested.emit(venta);
  }

  canMutate(venta: VentaResumen): boolean {
    return this.resolveVentaId(venta) > 0;
  }

  isDeleting(venta: VentaResumen): boolean {
    const idVenta = this.resolveVentaId(venta);

    if (idVenta <= 0) {
      return false;
    }

    return this.deletingVentaIds.has(idVenta);
  }

  trackByVenta(index: number, venta: VentaResumen): string {
    return this.resolveRowId(venta, index);
  }

  formatFecha(value: string): string {
    const date = this.parseDate(value);

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
    const date = this.parseDate(value);

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

  formatMonto(value: number | string): string {
    const amount = Number(value);

    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  private resolveRowId(venta: VentaResumen, index: number): string {
    const idVenta = this.resolveVentaId(venta);

    if (idVenta > 0) {
      return `venta-${idVenta}`;
    }

    return `tmp-${index}-${venta.created_at}-${venta.cliente}`;
  }

  private resolveVentaId(venta: VentaResumen): number {
    const parsed = Number(venta.id_venta);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseDate(value: string): Date | null {
    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
