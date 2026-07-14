import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CategoriaService } from '../materiales/categoria.service';
import { MaterialModalComponent } from '../materiales/material-modal.component';
import { Categoria } from '../materiales/material.interfaces';
import { IngresoMaterialOption, IngresoMaterialSucursal } from './ingreso.interfaces';
import { IngresoService } from './ingreso.service';

interface CategoriaFiltro {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-ingreso-material-catalog',
  standalone: true,
  imports: [MaterialModalComponent],
  templateUrl: './ingreso-material-catalog.component.html',
})
export class IngresoMaterialCatalogComponent implements OnInit {
  private readonly ingresoService = inject(IngresoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stockFormatter = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  readonly materiales = signal<IngresoMaterialOption[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly selectedCategoriaId = signal(0);
  readonly categoriasById = signal<Record<number, string>>({});
  readonly expandedStockIds = signal<Set<number>>(new Set<number>());
  readonly isMaterialModalOpen = signal(false);
  @Output() readonly materialAdded = new EventEmitter<IngresoMaterialOption>();

  readonly categorias = computed<CategoriaFiltro[]>(() => {
    const countByCategory = new Map<number, number>();

    for (const material of this.materiales()) {
      const categoriaId = this.toNumber(material.id_categoria);
      if (categoriaId <= 0) {
        continue;
      }

      countByCategory.set(categoriaId, (countByCategory.get(categoriaId) ?? 0) + 1);
    }

    return Array.from(countByCategory.entries())
      .map(([id]) => ({
        id,
        nombre: this.categoriasById()[id] ?? `Categoria ${id}`,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  readonly filteredMateriales = computed(() => {
    const categoriaId = this.selectedCategoriaId();
    const term = this.searchTerm().trim().toLowerCase();

    return this.materiales().filter((material) => {
      if (categoriaId !== 0 && this.toNumber(material.id_categoria) !== categoriaId) {
        return false;
      }

      if (!term) {
        return true;
      }

      const codigo = (material.codigo ?? '').toLowerCase();
      const nombre = (material.nombre ?? '').toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  });

  ngOnInit(): void {
    this.loadCatalogData();
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(target.value);
  }

  selectCategoria(idCategoria: number): void {
    this.selectedCategoriaId.set(this.toNumber(idCategoria));
  }

  toggleStock(materialId: number): void {
    const normalizedId = this.toNumber(materialId);
    if (normalizedId <= 0) {
      return;
    }

    this.expandedStockIds.update((current) => {
      const next = new Set(current);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  }

  isStockExpanded(materialId: number): boolean {
    return this.expandedStockIds().has(this.toNumber(materialId));
  }

  getCategoriaNombre(material: IngresoMaterialOption): string {
    const categoriaId = this.toNumber(material.id_categoria);
    if (categoriaId <= 0) {
      return 'Sin categoria';
    }

    return this.categoriasById()[categoriaId] ?? `Categoria ${categoriaId}`;
  }

  getMaterialColor(material: IngresoMaterialOption): string {
    const rawColor = (material.codigo_color ?? '').trim();
    if (!rawColor) {
      return '#e2e8f0';
    }

    const normalized = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#e2e8f0';
  }

  getStockTotal(material: IngresoMaterialOption): number {
    const total = Number(material.cantidad);
    if (Number.isFinite(total)) {
      return total;
    }

    return (material.sucursales ?? []).reduce((sum, item) => sum + this.toNumber(item.cantidad), 0);
  }

  formatStock(value: number): string {
    return this.stockFormatter.format(this.toNumber(value));
  }

  getSucursalLabel(sucursal: IngresoMaterialSucursal): string {
    const maybeName = (sucursal as { nombre_sucursal?: unknown }).nombre_sucursal;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) {
      return maybeName.trim();
    }

    return `Sucursal ${this.toNumber(sucursal.id_sucursal)}`;
  }

  openMaterialModal(): void {
    this.isMaterialModalOpen.set(true);
  }

  addMaterial(material: IngresoMaterialOption, event?: Event): void {
    event?.stopPropagation();
    this.materialAdded.emit(material);
  }

  closeMaterialModal(): void {
    this.isMaterialModalOpen.set(false);
  }

  onMaterialSaved(): void {
    this.isMaterialModalOpen.set(false);
    this.loadMateriales();
  }

  trackByMaterial(index: number, material: IngresoMaterialOption): number | string {
    return material.id_material ?? `${material.codigo}-${index}`;
  }

  private loadCatalogData(): void {
    this.loadCategorias();
    this.loadMateriales();
  }

  reloadCatalog(): void {
    this.loadCatalogData();
  }

  private loadMateriales(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ingresoService
      .getIngresoMateriales()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.materiales.set(response.data ?? []);
          this.expandedStockIds.set(new Set<number>());

          const selectedCategoria = this.selectedCategoriaId();
          if (
            selectedCategoria !== 0 &&
            !this.materiales().some(
              (material) => this.toNumber(material.id_categoria) === selectedCategoria,
            )
          ) {
            this.selectedCategoriaId.set(0);
          }
        },
        error: () => {
          this.materiales.set([]);
          this.expandedStockIds.set(new Set<number>());
          this.errorMessage.set('No se pudo cargar el catalogo de materiales para ingresos.');
        },
      });
  }

  private loadCategorias(): void {
    this.categoriaService
      .getCategorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categoriasById.set(this.buildCategoriasMap(response.data ?? []));
        },
        error: () => {
          this.categoriasById.set({});
        },
      });
  }

  private buildCategoriasMap(categorias: Categoria[]): Record<number, string> {
    const map: Record<number, string> = {};

    for (const categoria of categorias) {
      const id = this.toNumber(categoria.id_categoria ?? 0);
      if (id <= 0) {
        continue;
      }

      map[id] = this.resolveCategoriaName(categoria, id);
    }

    return map;
  }

  private resolveCategoriaName(categoria: Categoria, id: number): string {
    const rawName = categoria.nombre_categoria ?? categoria.nombre;
    if (typeof rawName === 'string' && rawName.trim().length > 0) {
      return rawName.trim();
    }

    return `Categoria ${id}`;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
