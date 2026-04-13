import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HerramientaModalComponent } from './herramienta-modal.component';
import { Herramienta } from './herramienta.interfaces';
import { HerramientaService } from './herramienta.service';
import { SucursalService } from '../shared/sucursal/sucursal.service';

type EstadoAction = 'activando' | 'desactivando';

@Component({
  selector: 'app-herramienta-catalog',
  standalone: true,
  imports: [HerramientaModalComponent],
  templateUrl: './herramienta-catalog.component.html',
})
export class HerramientaCatalogComponent implements OnInit {
  private readonly herramientaService = inject(HerramientaService);
  private readonly sucursalService = inject(SucursalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly herramientas = signal<Herramienta[]>([]);
  readonly searchTerm = signal('');
  readonly isModalOpen = signal(false);
  readonly selectedHerramienta = signal<Herramienta | undefined>(undefined);
  readonly estadoActionByHerramienta = signal<Record<number, EstadoAction>>({});
  readonly expandedCardKeys = signal<Set<string>>(new Set<string>());

  readonly sucursales = computed(() =>
    this.sucursalService.sucursales().map((sucursal) => ({
      id_sucursal: sucursal.id_sucursal,
      nombre_sucursal: sucursal.nombre,
    })),
  );

  readonly filteredHerramientas = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.herramientas();
    }

    return this.herramientas().filter((herramienta) => {
      const nombre = herramienta.nombre.toLowerCase();
      const categoria = (herramienta.nombre_categoria_herramienta ?? '').toLowerCase();
      return nombre.includes(term) || categoria.includes(term);
    });
  });

  ngOnInit(): void {
    this.loadHerramientas();

    this.sucursalService.loadSucursales().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  loadHerramientas(): void {
    this.herramientaService
      .getHerramientas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.herramientas.set(response.data ?? []);
          this.estadoActionByHerramienta.set({});
          this.expandedCardKeys.set(new Set<string>());
        },
        error: () => {
          this.herramientas.set([]);
          this.estadoActionByHerramienta.set({});
          this.expandedCardKeys.set(new Set<string>());
        },
      });
  }

  onSearchInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(input.value);
  }

  openModal(herramienta?: Herramienta): void {
    this.selectedHerramienta.set(herramienta);
    this.isModalOpen.set(true);
  }

  onCardKeydown(event: KeyboardEvent, herramienta: Herramienta, index: number): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.toggleCardExpansion(herramienta, index);
  }

  toggleCardExpansion(herramienta: Herramienta, index: number): void {
    const key = this.buildCardKey(herramienta, index);
    const next = new Set(this.expandedCardKeys());

    if (next.has(key)) {
      next.delete(key);
      this.expandedCardKeys.set(next);
      return;
    }

    next.add(key);
    this.expandedCardKeys.set(next);
    this.loadDistribucionTemplate(herramienta);
  }

  isCardExpanded(herramienta: Herramienta, index: number): boolean {
    return this.expandedCardKeys().has(this.buildCardKey(herramienta, index));
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedHerramienta.set(undefined);
    this.loadHerramientas();
  }

  toggleEstado(herramienta: Herramienta): void {
    if (typeof herramienta.id_herramienta !== 'number') {
      return;
    }

    const idHerramienta = herramienta.id_herramienta;
    if (this.isEstadoProcessing(idHerramienta)) {
      return;
    }

    const isActive = this.isHerramientaActive(herramienta);
    const action: EstadoAction = isActive ? 'desactivando' : 'activando';

    this.estadoActionByHerramienta.update((current) => ({
      ...current,
      [idHerramienta]: action,
    }));

    const request$ = isActive
      ? this.herramientaService.desactivarHerramienta(idHerramienta)
      : this.herramientaService.activarHerramienta(idHerramienta);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.estadoActionByHerramienta.update((current) => {
            const next = { ...current };
            delete next[idHerramienta];
            return next;
          });
        }),
      )
      .subscribe({
        next: () => this.loadHerramientas(),
      });
  }

  isHerramientaActive(herramienta: Herramienta): boolean {
    return this.resolveEstado(herramienta.estado);
  }

  isHerramientaInactive(herramienta: Herramienta): boolean {
    return !this.isHerramientaActive(herramienta);
  }

  isEstadoProcessing(idHerramienta: number): boolean {
    return !!this.estadoActionByHerramienta()[idHerramienta];
  }

  getEstadoActionText(idHerramienta: number): string {
    return this.estadoActionByHerramienta()[idHerramienta] === 'activando'
      ? 'Activando...'
      : 'Desactivando...';
  }

  getCategoria(herramienta: Herramienta): string {
    return herramienta.nombre_categoria_herramienta ?? 'Sin categoria';
  }

  getCantidadDisponible(herramienta: Herramienta): number {
    return this.toNumber(herramienta.cantidad_disponible);
  }

  getCantidadTotal(herramienta: Herramienta): number {
    return this.toNumber(herramienta.cantidad_total);
  }

  getCantidadEnObra(herramienta: Herramienta): number {
    const total = this.getCantidadTotal(herramienta);
    const disponible = this.getCantidadDisponible(herramienta);
    return Math.max(total - disponible, 0);
  }

  trackByHerramienta(index: number, herramienta: Herramienta): number | string {
    return herramienta.id_herramienta ?? `${herramienta.nombre}-${index}`;
  }

  private toNumber(value: string | number | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildCardKey(herramienta: Herramienta, index: number): string {
    if (typeof herramienta.id_herramienta === 'number') {
      return `h-${herramienta.id_herramienta}`;
    }

    return `tmp-${index}-${herramienta.nombre}`;
  }

  private loadDistribucionTemplate(_herramienta: Herramienta): void {
    // Placeholder: aqui se consumira el endpoint de distribucion en obra cuando este disponible.
  }

  private resolveEstado(estado: unknown): boolean {
    if (estado === undefined || estado === null) {
      return true;
    }

    if (typeof estado === 'boolean') {
      return estado;
    }

    if (typeof estado === 'number') {
      return estado === 1;
    }

    if (typeof estado === 'string') {
      const value = estado.trim().toLowerCase();

      if (value === '1' || value === 'true') {
        return true;
      }

      if (value === '0' || value === 'false') {
        return false;
      }
    }

    return Boolean(estado);
  }
}
