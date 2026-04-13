import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  SmartSelectComponent,
  SmartSelectCreatePayload,
  SmartSelectUpdatePayload,
} from '../materiales/smart-select.component';
import { CategoriaHerramientaService } from './categoria-herramienta.service';
import {
  CategoriaHerramienta,
  Herramienta,
  HerramientaCreatePayload,
  HerramientaStock,
  HerramientaStockDetail,
  HerramientaUpdatePayload,
  SucursalHerramientaOption,
} from './herramienta.interfaces';
import { HerramientaService } from './herramienta.service';

type SmartSelectItem = Record<string, unknown>;

type StockFormGroup = FormGroup<{
  id_sucursal: FormControl<number>;
  cantidad: FormControl<number>;
}>;

interface HerramientaFormControls {
  nombre: FormControl<string | null>;
  id_categoria_herramienta: FormControl<number | null>;
  stocks: FormArray<StockFormGroup>;
}

type HerramientaFormGroup = FormGroup<HerramientaFormControls>;

@Component({
  selector: 'app-herramienta-modal',
  standalone: true,
  imports: [ReactiveFormsModule, SmartSelectComponent],
  templateUrl: './herramienta-modal.component.html',
})
export class HerramientaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly herramientaService = inject(HerramientaService);
  private readonly categoriaHerramientaService = inject(CategoriaHerramientaService);

  private readonly sucursalesInput = signal<SucursalHerramientaOption[]>([]);
  private herramientaToEditInternal?: Herramienta;
  private stocksForCurrentEdit?: HerramientaStock[];
  private stockRequestNonce = 0;
  private editingHerramientaId?: number;

  private readonly defaultSucursales: SucursalHerramientaOption[] = [];

  @Input()
  set herramientaToEdit(value: Herramienta | undefined) {
    const nextId =
      typeof value?.id_herramienta === 'number' ? this.toNumber(value.id_herramienta) : undefined;
    const changedHerramienta = nextId !== this.editingHerramientaId;

    if (changedHerramienta) {
      this.editingHerramientaId = nextId;
      this.stocksForCurrentEdit = value?.stocks;
    }

    this.herramientaToEditInternal = value;
    this.patchFormForEdit(value);

    if (changedHerramienta) {
      this.loadStockForEdit(value);
    }
  }

  get herramientaToEdit(): Herramienta | undefined {
    return this.herramientaToEditInternal;
  }

  @Input()
  set sucursales(value: SucursalHerramientaOption[] | null | undefined) {
    this.sucursalesInput.set(this.normalizeSucursales(value ?? []));
    this.rebuildStocksControls(this.herramientaToEditInternal);
  }

  @Output('close') readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Herramienta>();

  readonly isLoadingCategorias = signal(false);
  readonly isLoadingStock = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly categorias = signal<CategoriaHerramienta[]>([]);

  readonly resolvedSucursales = computed<SucursalHerramientaOption[]>(() => {
    const incoming = this.sucursalesInput();
    return incoming.length > 0 ? incoming : this.defaultSucursales;
  });

  readonly categoriaItems = computed<SmartSelectItem[]>(() =>
    this.categorias().map((categoria) => ({
      ...categoria,
      label: categoria.nombre,
    })),
  );

  readonly form: HerramientaFormGroup = this.fb.group<HerramientaFormControls>({
    nombre: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    id_categoria_herramienta: this.fb.control<number | null>(null, {
      validators: [Validators.required],
    }),
    stocks: this.fb.array<StockFormGroup>([]),
  });

  get stockControls(): StockFormGroup[] {
    return this.form.controls.stocks.controls;
  }

  ngOnInit(): void {
    this.loadCategoriasHerramienta();
    this.rebuildStocksControls(this.herramientaToEditInternal);
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    const payload = this.buildPayload();

    if (this.herramientaToEditInternal?.id_herramienta) {
      const updatePayload: HerramientaUpdatePayload = {
        id_herramienta: this.herramientaToEditInternal.id_herramienta,
        ...payload,
      };

      this.herramientaService
        .updateHerramienta(updatePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.saved.emit(response.data);
            this.close();
          },
          error: () => {
            this.isSaving.set(false);
            this.errorMessage.set('No se pudo actualizar la herramienta.');
          },
        });
      return;
    }

    this.herramientaService
      .createHerramienta(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.saved.emit(response.data);
          this.close();
        },
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set('No se pudo crear la herramienta.');
        },
      });
  }

  handleCategoriaSelection(idCategoriaHerramienta: number): void {
    this.form.controls.id_categoria_herramienta.setValue(idCategoriaHerramienta);
    this.form.controls.id_categoria_herramienta.markAsDirty();
  }

  createCategoriaHerramienta(payload: SmartSelectCreatePayload): void {
    this.categoriaHerramientaService
      .createCategoriaHerramienta({ nombre: payload.nombre })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const createdId = response.data.id_categoria_herramienta;
          this.loadCategoriasHerramienta();

          if (typeof createdId === 'number') {
            this.form.controls.id_categoria_herramienta.setValue(createdId);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo crear la categoria de herramienta.');
        },
      });
  }

  updateCategoriaHerramienta(payload: SmartSelectUpdatePayload): void {
    this.categoriaHerramientaService
      .updateCategoriaHerramienta({
        id_categoria_herramienta: payload.id,
        nombre: payload.nombre,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadCategoriasHerramienta();
        },
        error: () => {
          this.errorMessage.set('No se pudo actualizar la categoria de herramienta.');
        },
      });
  }

  deleteCategoriaHerramienta(idCategoriaHerramienta: number): void {
    this.categoriaHerramientaService
      .deleteCategoriaHerramienta(idCategoriaHerramienta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadCategoriasHerramienta();

          if (this.form.controls.id_categoria_herramienta.value === idCategoriaHerramienta) {
            this.form.controls.id_categoria_herramienta.setValue(null);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo desactivar la categoria de herramienta.');
        },
      });
  }

  trackByStockControl(_index: number, stockControl: StockFormGroup): number {
    return this.toNumber(stockControl.controls.id_sucursal.value);
  }

  getSucursalNameByStockControl(stockControl: StockFormGroup): string {
    const idSucursal = this.toNumber(stockControl.controls.id_sucursal.value);

    const resolved = this.resolvedSucursales().find(
      (sucursal) => this.toNumber(sucursal.id_sucursal) === idSucursal,
    );
    if (resolved?.nombre_sucursal) {
      return resolved.nombre_sucursal;
    }

    const fromStock = this.stocksForCurrentEdit?.find(
      (stock) => this.toNumber(stock.id_sucursal) === idSucursal,
    );
    if (fromStock?.nombre_sucursal) {
      return fromStock.nombre_sucursal;
    }

    return idSucursal > 0 ? `Sucursal ${idSucursal}` : 'Sucursal';
  }

  private loadCategoriasHerramienta(): void {
    this.isLoadingCategorias.set(true);
    this.errorMessage.set(null);

    this.categoriaHerramientaService
      .getCategoriasHerramienta()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categorias.set(response.data ?? []);
          this.isLoadingCategorias.set(false);
        },
        error: () => {
          this.isLoadingCategorias.set(false);
          this.errorMessage.set('No se pudieron cargar las categorias de herramientas.');
        },
      });
  }

  private patchFormForEdit(herramienta?: Herramienta): void {
    if (!herramienta) {
      this.form.reset({
        nombre: null,
        id_categoria_herramienta: null,
      });

      this.editingHerramientaId = undefined;
      this.stocksForCurrentEdit = undefined;
      this.rebuildStocksControls(undefined);
      return;
    }

    this.form.patchValue({
      nombre: herramienta.nombre,
      id_categoria_herramienta: herramienta.id_categoria_herramienta,
    });

    this.rebuildStocksControls(herramienta);
  }

  private rebuildStocksControls(herramienta?: Herramienta): void {
    const stocksArray = this.form.controls.stocks;
    stocksArray.clear();

    const stocksSource = this.stocksForCurrentEdit ?? herramienta?.stocks;
    const sucursalesForControls = this.buildSucursalesForControls(stocksSource);

    for (const sucursal of sucursalesForControls) {
      const cantidad = this.getCantidadForSucursal(sucursal.id_sucursal, stocksSource);

      stocksArray.push(
        this.fb.group({
          id_sucursal: this.fb.control<number>(sucursal.id_sucursal, {
            nonNullable: true,
          }),
          cantidad: this.fb.control<number>(cantidad, {
            nonNullable: true,
            validators: [Validators.required, Validators.min(0)],
          }),
        }),
      );
    }
  }

  private loadStockForEdit(herramienta?: Herramienta): void {
    this.stockRequestNonce += 1;
    const requestNonce = this.stockRequestNonce;

    if (typeof herramienta?.id_herramienta !== 'number') {
      this.isLoadingStock.set(false);
      return;
    }

    this.errorMessage.set(null);
    this.isLoadingStock.set(true);

    this.herramientaService
      .getHerramientaStock(herramienta.id_herramienta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestNonce !== this.stockRequestNonce) {
            return;
          }

          this.stocksForCurrentEdit = this.mapStockDetailToEditable(response.data);
          this.rebuildStocksControls(this.herramientaToEditInternal);
          this.applyStockValuesToControls(this.stocksForCurrentEdit);
          this.isLoadingStock.set(false);
        },
        error: () => {
          if (requestNonce !== this.stockRequestNonce) {
            return;
          }

          this.isLoadingStock.set(false);
          this.errorMessage.set('No se pudo cargar el stock por sucursal de la herramienta.');
        },
      });
  }

  private buildPayload(): HerramientaCreatePayload {
    const rawValue = this.form.getRawValue();

    return {
      nombre: rawValue.nombre?.trim() ?? '',
      id_categoria_herramienta: rawValue.id_categoria_herramienta ?? 0,
      stocks: rawValue.stocks.map((stock) => ({
        id_sucursal: stock.id_sucursal,
        cantidad: Number.isFinite(stock.cantidad) ? stock.cantidad : 0,
      })),
    };
  }

  private getCantidadForSucursal(idSucursal: number, stocks?: HerramientaStock[]): number {
    if (!stocks || stocks.length === 0) {
      return 0;
    }

    const stock = stocks.find(
      (item) => this.toNumber(item.id_sucursal) === this.toNumber(idSucursal),
    );
    if (!stock) {
      return 0;
    }

    const cantidad = Number(stock.cantidad);
    return Number.isFinite(cantidad) ? cantidad : 0;
  }

  private mapStockDetailToEditable(stockDetail?: HerramientaStockDetail): HerramientaStock[] {
    const result: HerramientaStock[] = [];

    for (const stock of stockDetail?.sucursales ?? []) {
      const idSucursal = Number(stock.id_sucursal);
      if (!Number.isFinite(idSucursal)) {
        continue;
      }

      const cantidadTotal = Number(stock.cantidad_total);
      const cantidadDisponible = Number(stock.cantidad_disponible);

      result.push({
        id_sucursal: idSucursal,
        cantidad: this.resolveCantidadStock(cantidadTotal, cantidadDisponible),
        nombre_sucursal: stock.nombre_sucursal,
      });
    }

    return result;
  }

  private resolveCantidadStock(cantidadTotal: number, cantidadDisponible: number): number {
    if (Number.isFinite(cantidadTotal)) {
      return cantidadTotal;
    }

    return Number.isFinite(cantidadDisponible) ? cantidadDisponible : 0;
  }

  private buildSucursalesForControls(stocks?: HerramientaStock[]): SucursalHerramientaOption[] {
    const merged: SucursalHerramientaOption[] = [...this.resolvedSucursales()];
    const seen = new Set<number>(
      merged.map((sucursal) => this.toNumber(sucursal.id_sucursal)).filter((id) => id > 0),
    );

    for (const stock of stocks ?? []) {
      const idSucursal = this.toNumber(stock.id_sucursal);
      if (idSucursal <= 0 || seen.has(idSucursal)) {
        continue;
      }

      merged.push({
        id_sucursal: idSucursal,
        nombre_sucursal:
          typeof stock.nombre_sucursal === 'string' && stock.nombre_sucursal.trim().length > 0
            ? stock.nombre_sucursal
            : `Sucursal ${idSucursal}`,
      });

      seen.add(idSucursal);
    }

    return merged;
  }

  private normalizeSucursales(
    sucursales: SucursalHerramientaOption[],
  ): SucursalHerramientaOption[] {
    return sucursales
      .map((sucursal) => {
        const idSucursal = this.toNumber(sucursal.id_sucursal);
        if (idSucursal <= 0) {
          return null;
        }

        return {
          id_sucursal: idSucursal,
          nombre_sucursal: sucursal.nombre_sucursal,
        };
      })
      .filter((sucursal): sucursal is SucursalHerramientaOption => sucursal !== null);
  }

  private applyStockValuesToControls(stocks: HerramientaStock[]): void {
    if (stocks.length === 0) {
      return;
    }

    const cantidadBySucursal = new Map<number, number>();

    for (const stock of stocks) {
      const idSucursal = this.toNumber(stock.id_sucursal);
      if (idSucursal <= 0) {
        continue;
      }

      const cantidad = this.toNumber(stock.cantidad);
      cantidadBySucursal.set(idSucursal, cantidad);
    }

    for (const stockControl of this.stockControls) {
      const idSucursal = this.toNumber(stockControl.controls.id_sucursal.value);
      if (!cantidadBySucursal.has(idSucursal)) {
        continue;
      }

      stockControl.controls.cantidad.setValue(cantidadBySucursal.get(idSucursal) ?? 0, {
        emitEvent: false,
      });
    }
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
