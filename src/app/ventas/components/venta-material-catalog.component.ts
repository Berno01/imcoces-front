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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { SucursalService } from '../../shared/sucursal/sucursal.service';
import { VentaMaterialOption } from '../venta.interfaces';
import { VentaService } from '../venta.service';

type MaterialViewMode = 'nuevo' | 'reciclado';

interface CategoriaRapida {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-venta-material-catalog',
  standalone: true,
  templateUrl: './venta-material-catalog.component.html',
})
export class VentaMaterialCatalogComponent {
  private readonly ventaService = inject(VentaService);
  private readonly sucursalService = inject(SucursalService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stockFormatter = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  private readonly priceFormatter = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly materiales = signal<VentaMaterialOption[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly viewMode = signal<MaterialViewMode>('nuevo');
  readonly selectedCategoriaId = signal(0);
  readonly refreshTick = signal(0);

  readonly selectedSucursalId = computed(() => this.sucursalService.selectedSucursalId());
  readonly selectedSucursalName = computed(
    () => this.sucursalService.selectedSucursal()?.nombre ?? 'Todas las sucursales',
  );

  readonly materialesFiltradosPorTipo = computed(() => {
    const mode = this.viewMode();

    return this.materiales().filter((material) => {
      const reciclado = this.isReciclado(material.is_reciclado);
      return mode === 'reciclado' ? reciclado : !reciclado;
    });
  });

  readonly categoriasRapidas = computed<CategoriaRapida[]>(() => {
    const map = new Map<number, string>();

    for (const material of this.materialesFiltradosPorTipo()) {
      const idCategoria = this.toNumber(material.id_categoria);
      if (idCategoria <= 0) {
        continue;
      }

      const nombreCategoria = this.toText(material.nombre_categoria) || `Categoria ${idCategoria}`;
      if (!map.has(idCategoria)) {
        map.set(idCategoria, nombreCategoria);
      }
    }

    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  readonly materialesFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedCategoria = this.selectedCategoriaId();

    return this.materialesFiltradosPorTipo().filter((material) => {
      if (selectedCategoria > 0 && this.toNumber(material.id_categoria) !== selectedCategoria) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = [
        this.toText(material.nombre),
        this.toText(material.nombre_color),
        this.toText(material.codigo),
        this.toText(material.medida),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  });

  @Output() readonly materialAdded = new EventEmitter<VentaMaterialOption>();

  constructor() {
    effect(() => {
      this.refreshTick();

      const idSucursal = this.toNumber(this.selectedSucursalId());

      if (idSucursal <= 0) {
        this.isLoading.set(false);
        this.materiales.set([]);
        this.selectedCategoriaId.set(0);
        this.errorMessage.set(
          'Seleccione una sucursal especifica en el navbar para cargar materiales de venta.',
        );
        return;
      }

      this.loadMateriales(idSucursal);
    });
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(target.value);
  }

  selectViewMode(mode: MaterialViewMode): void {
    this.viewMode.set(mode);
    this.selectedCategoriaId.set(0);
  }

  selectCategoria(idCategoria: number): void {
    this.selectedCategoriaId.set(this.toNumber(idCategoria));
  }

  addMaterial(material: VentaMaterialOption, event?: Event): void {
    event?.stopPropagation();
    this.materialAdded.emit(material);
  }

  reloadCatalog(): void {
    this.refreshTick.update((value) => value + 1);
  }

  formatStock(value: number): string {
    return this.stockFormatter.format(this.toNumber(value));
  }

  formatPrecio(value: number): string {
    return this.priceFormatter.format(this.toNumber(value));
  }

  getCategoriaLabel(material: VentaMaterialOption): string {
    return this.toText(material.nombre_categoria) || 'Sin categoria';
  }

  getColorDot(material: VentaMaterialOption): string {
    const code = this.toText(material.codigo_color);
    return code || '#cbd5e1';
  }

  trackByMaterial(index: number, material: VentaMaterialOption): number | string {
    return material.id_material ?? `${material.codigo}-${index}`;
  }

  isMaterialOutOfStock(material: VentaMaterialOption): boolean {
    return this.toNumber(material.cantidad) <= 0;
  }

  private loadMateriales(idSucursal: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ventaService
      .getVentaMateriales(idSucursal)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.materiales.set(response.data ?? []);

          const categoriaActual = this.selectedCategoriaId();
          if (
            categoriaActual > 0 &&
            !this.materialesFiltradosPorTipo().some(
              (material) => this.toNumber(material.id_categoria) === categoriaActual,
            )
          ) {
            this.selectedCategoriaId.set(0);
          }
        },
        error: () => {
          this.materiales.set([]);
          this.selectedCategoriaId.set(0);
          this.errorMessage.set('No se pudo cargar el catalogo de materiales para venta.');
        },
      });
  }

  private isReciclado(value: unknown): boolean {
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

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }
}
