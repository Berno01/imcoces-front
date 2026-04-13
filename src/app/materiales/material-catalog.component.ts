import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MaterialModalComponent } from './material-modal.component';
import { Material, MaterialStockDetail } from './material.interfaces';
import { MaterialService } from './material.service';

type EstadoAction = 'activando' | 'desactivando';

@Component({
  selector: 'app-material-catalog',
  standalone: true,
  imports: [MaterialModalComponent],
  templateUrl: './material-catalog.component.html',
})
export class MaterialCatalogComponent implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly moneyFormatter = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly materiales = signal<Material[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedMaterial = signal<Material | undefined>(undefined);
  readonly expandedCards = signal<Set<number>>(new Set<number>());
  readonly stockByMaterial = signal<Record<number, MaterialStockDetail>>({});
  readonly loadingStockIds = signal<Set<number>>(new Set<number>());
  readonly estadoActionByMaterial = signal<Record<number, EstadoAction>>({});

  readonly filteredMateriales = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.materiales();
    }

    return this.materiales().filter((material) => {
      const codigo = material.codigo.toLowerCase();
      const nombre = material.nombre.toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  });

  ngOnInit(): void {
    this.loadMateriales();
  }

  loadMateriales(): void {
    this.materialService
      .getMateriales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.materiales.set(response.data ?? []);
          this.expandedCards.set(new Set<number>());
          this.stockByMaterial.set({});
          this.loadingStockIds.set(new Set<number>());
          this.estadoActionByMaterial.set({});
        },
        error: () => {
          this.materiales.set([]);
          this.expandedCards.set(new Set<number>());
          this.stockByMaterial.set({});
          this.loadingStockIds.set(new Set<number>());
          this.estadoActionByMaterial.set({});
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

  toggleAccordion(id: number): void {
    const next = new Set(this.expandedCards());

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);

      if (!this.stockByMaterial()[id]) {
        this.loadMaterialStock(id);
      }
    }

    this.expandedCards.set(next);
  }

  openModal(material?: Material): void {
    this.selectedMaterial.set(material);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedMaterial.set(undefined);
    this.loadMateriales();
  }

  toggleEstado(material: Material): void {
    if (typeof material.id_material !== 'number') {
      return;
    }

    const materialId = material.id_material;
    if (this.isEstadoProcessing(materialId)) {
      return;
    }

    const isActive = this.isMaterialActive(material);
    const action: EstadoAction = isActive ? 'desactivando' : 'activando';
    this.estadoActionByMaterial.update((current) => ({
      ...current,
      [materialId]: action,
    }));

    const request$ = isActive
      ? this.materialService.desactivarMaterial(materialId)
      : this.materialService.activarMaterial(materialId);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.estadoActionByMaterial.update((current) => {
            const next = { ...current };
            delete next[materialId];
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.loadMateriales();
        },
      });
  }

  isExpanded(id: number): boolean {
    return this.expandedCards().has(id);
  }

  isStockLoading(id: number): boolean {
    return this.loadingStockIds().has(id);
  }

  getStockDetail(id: number): MaterialStockDetail | undefined {
    return this.stockByMaterial()[id];
  }

  isLowStockById(id: number): boolean {
    const detail = this.stockByMaterial()[id];
    return (detail?.total_stock ?? 0) <= 10;
  }

  isMaterialActive(material: Material): boolean {
    return this.resolveEstado(material.estado);
  }

  isMaterialInactive(material: Material): boolean {
    return !this.isMaterialActive(material);
  }

  isEstadoProcessing(materialId: number): boolean {
    return !!this.estadoActionByMaterial()[materialId];
  }

  getEstadoActionText(materialId: number): string {
    return this.estadoActionByMaterial()[materialId] === 'activando'
      ? 'Activando...'
      : 'Desactivando...';
  }

  getCategoria(material: Material): string {
    return material.nombre_categoria ?? 'Sin categoria';
  }

  formatMoney(value: number): string {
    return this.moneyFormatter.format(value);
  }

  trackByMaterial(index: number, material: Material): number | string {
    return material.id_material ?? `${material.codigo}-${index}`;
  }

  private loadMaterialStock(idMaterial: number): void {
    const loadingNext = new Set(this.loadingStockIds());
    loadingNext.add(idMaterial);
    this.loadingStockIds.set(loadingNext);

    this.materialService
      .getMaterialStock(idMaterial)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.stockByMaterial.update((current) => ({
            ...current,
            [idMaterial]: response.data,
          }));

          const doneLoading = new Set(this.loadingStockIds());
          doneLoading.delete(idMaterial);
          this.loadingStockIds.set(doneLoading);
        },
        error: () => {
          const doneLoading = new Set(this.loadingStockIds());
          doneLoading.delete(idMaterial);
          this.loadingStockIds.set(doneLoading);
        },
      });
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
