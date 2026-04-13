import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, startWith } from 'rxjs';

import { CategoriaService } from './categoria.service';
import { ColorService } from './color.service';
import { MaterialService } from './material.service';
import { Categoria, Color, Material } from './material.interfaces';
import {
  SmartSelectComponent,
  SmartSelectCreatePayload,
  SmartSelectUpdatePayload
} from './smart-select.component';

interface MaterialFormControls {
  codigo: FormControl<string | null>;
  nombre: FormControl<string | null>;
  id_categoria: FormControl<number | null>;
  id_color: FormControl<number | null>;
  costo: FormControl<number>;
  precio: FormControl<number>;
  medida: FormControl<number>;
  is_reciclado: FormControl<boolean>;
  has_vencimiento: FormControl<boolean>;
  fecha_vencimiento: FormControl<string | null>;
}

type MaterialFormGroup = FormGroup<MaterialFormControls>;
type SmartSelectItem = Record<string, unknown>;

@Component({
  selector: 'app-material-modal',
  standalone: true,
  imports: [ReactiveFormsModule, SmartSelectComponent],
  templateUrl: './material-modal.component.html'
})
export class MaterialModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly materialService = inject(MaterialService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly colorService = inject(ColorService);

  private materialToEditInternal?: Material;

  @Input()
  set materialToEdit(value: Material | undefined) {
    this.materialToEditInternal = value;
    this.patchFormForEdit(value);
  }

  get materialToEdit(): Material | undefined {
    return this.materialToEditInternal;
  }

  @Output('close') readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Material>();

  readonly isLoadingCatalogs = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly categorias = signal<Categoria[]>([]);
  readonly colores = signal<Color[]>([]);

  readonly categoriaItems = computed<SmartSelectItem[]>(() =>
    this.categorias().map((categoria) => ({
      ...categoria,
      label: this.getCategoriaNombre(categoria)
    }))
  );

  readonly colorItems = computed<SmartSelectItem[]>(() =>
    this.colores().map((color) => ({
      ...color,
      label: this.getColorNombre(color),
      codigo: color.codigo ?? color.codigo_color ?? '#9ca3af'
    }))
  );

  readonly form: MaterialFormGroup = this.fb.group<MaterialFormControls>({
    codigo: this.fb.control<string | null>(null, {
      validators: [Validators.required]
    }),
    nombre: this.fb.control<string | null>(null, {
      validators: [Validators.required]
    }),
    id_categoria: this.fb.control<number | null>(null, {
      validators: [Validators.required]
    }),
    id_color: this.fb.control<number | null>(null, {
      validators: [Validators.required]
    }),
    costo: this.fb.control<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)]
    }),
    precio: this.fb.control<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)]
    }),
    medida: this.fb.control<number>(1, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    is_reciclado: this.fb.control<boolean>(false, {
      nonNullable: true
    }),
    has_vencimiento: this.fb.control<boolean>(false, {
      nonNullable: true
    }),
    fecha_vencimiento: this.fb.control<string | null>(
      {
        value: null,
        disabled: true
      },
      {
        validators: []
      }
    )
  });

  ngOnInit(): void {
    this.loadCatalogos();

    this.form.controls.has_vencimiento.valueChanges
      .pipe(startWith(this.form.controls.has_vencimiento.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((hasVencimiento) => {
        this.toggleFechaVencimiento(hasVencimiento);
      });

    if (this.materialToEditInternal) {
      this.patchFormForEdit(this.materialToEditInternal);
    }
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

    const payload = this.buildMaterialPayload();

    if (this.materialToEditInternal?.id_material) {
      payload.id_material = this.materialToEditInternal.id_material;
      this.materialService
        .updateMaterial(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.saved.emit(response.data);
            this.close();
          },
          error: () => {
            this.isSaving.set(false);
            this.errorMessage.set('No se pudo actualizar el material.');
          }
        });
      return;
    }

    this.materialService
      .createMaterial(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.saved.emit(response.data);
          this.close();
        },
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set('No se pudo crear el material.');
        }
      });
  }

  handleCategoriaSelection(idCategoria: number): void {
    this.form.controls.id_categoria.setValue(idCategoria);
    this.form.controls.id_categoria.markAsDirty();
  }

  handleColorSelection(idColor: number): void {
    this.form.controls.id_color.setValue(idColor);
    this.form.controls.id_color.markAsDirty();
  }

  createCategoria(payload: SmartSelectCreatePayload): void {
    this.categoriaService
      .createCategoria({ nombre: payload.nombre })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const createdId = response.data.id_categoria;
          this.loadCategorias();
          if (typeof createdId === 'number') {
            this.form.controls.id_categoria.setValue(createdId);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo crear la categoria.');
        }
      });
  }

  updateCategoria(payload: SmartSelectUpdatePayload): void {
    this.categoriaService
      .updateCategoria({
        id_categoria: payload.id,
        nombre: payload.nombre
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadCategorias(),
        error: () => {
          this.errorMessage.set('No se pudo actualizar la categoria.');
        }
      });
  }

  deleteCategoria(idCategoria: number): void {
    this.categoriaService
      .deleteCategoria(idCategoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadCategorias();
          if (this.form.controls.id_categoria.value === idCategoria) {
            this.form.controls.id_categoria.setValue(null);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar la categoria.');
        }
      });
  }

  createColor(payload: SmartSelectCreatePayload): void {
    this.colorService
      .createColor({
        nombre: payload.nombre,
        codigo: payload.codigo ?? '#2563eb'
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const createdId = response.data.id_color;
          this.loadColores();
          if (typeof createdId === 'number') {
            this.form.controls.id_color.setValue(createdId);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo crear el color.');
        }
      });
  }

  updateColor(payload: SmartSelectUpdatePayload): void {
    this.colorService
      .updateColor({
        id_color: payload.id,
        nombre: payload.nombre,
        codigo: payload.codigo ?? '#2563eb'
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadColores(),
        error: () => {
          this.errorMessage.set('No se pudo actualizar el color.');
        }
      });
  }

  deleteColor(idColor: number): void {
    this.colorService
      .deleteColor(idColor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadColores();
          if (this.form.controls.id_color.value === idColor) {
            this.form.controls.id_color.setValue(null);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar el color.');
        }
      });
  }

  private loadCatalogos(): void {
    this.isLoadingCatalogs.set(true);
    this.errorMessage.set(null);

    forkJoin({
      categorias: this.categoriaService.getCategorias(),
      colores: this.colorService.getColores()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ categorias, colores }) => {
          this.categorias.set(categorias.data ?? []);
          this.colores.set(colores.data ?? []);
          this.isLoadingCatalogs.set(false);
        },
        error: () => {
          this.isLoadingCatalogs.set(false);
          this.errorMessage.set('No se pudieron cargar categorias y colores.');
        }
      });
  }

  private loadCategorias(): void {
    this.categoriaService
      .getCategorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categorias.set(response.data ?? []);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las categorias.');
        }
      });
  }

  private loadColores(): void {
    this.colorService
      .getColores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.colores.set(response.data ?? []);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los colores.');
        }
      });
  }

  private toggleFechaVencimiento(hasVencimiento: boolean): void {
    const fechaControl = this.form.controls.fecha_vencimiento;

    if (hasVencimiento) {
      fechaControl.enable({ emitEvent: false });
      fechaControl.setValidators([Validators.required]);
      fechaControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    fechaControl.setValue(null, { emitEvent: false });
    fechaControl.disable({ emitEvent: false });
    fechaControl.clearValidators();
    fechaControl.updateValueAndValidity({ emitEvent: false });
  }

  private patchFormForEdit(material?: Material): void {
    if (!material) {
      this.form.reset({
        codigo: null,
        nombre: null,
        id_categoria: null,
        id_color: null,
        costo: 0,
        precio: 0,
        medida: 1,
        is_reciclado: false,
        has_vencimiento: false,
        fecha_vencimiento: null
      });
      this.toggleFechaVencimiento(false);
      return;
    }

    const hasVencimiento = typeof material.fecha_vencimiento === 'string' && material.fecha_vencimiento.length > 0;

    this.form.patchValue({
      codigo: material.codigo,
      nombre: material.nombre,
      id_categoria: material.id_categoria,
      id_color: material.id_color,
      costo: material.costo,
      precio: material.precio,
      medida: this.normalizeMedida(material.medida),
      is_reciclado: this.normalizeReciclado(material.is_reciclado),
      has_vencimiento: hasVencimiento,
      fecha_vencimiento: hasVencimiento
        ? this.toDateInputValue(material.fecha_vencimiento)
        : null
    });

    this.toggleFechaVencimiento(hasVencimiento);
  }

  private buildMaterialPayload(): Partial<Material> {
    const rawValue = this.form.getRawValue();

    const payload: Partial<Material> = {
      codigo: rawValue.codigo?.trim() ?? '',
      nombre: rawValue.nombre?.trim() ?? '',
      id_categoria: rawValue.id_categoria ?? 0,
      id_color: rawValue.id_color ?? 0,
      costo: rawValue.costo,
      precio: rawValue.precio,
      medida: rawValue.medida,
      is_reciclado: rawValue.is_reciclado
    };

    if (rawValue.has_vencimiento && rawValue.fecha_vencimiento) {
      payload.fecha_vencimiento = rawValue.fecha_vencimiento;
    }

    return payload;
  }

  private normalizeReciclado(value: Material['is_reciclado']): boolean {
    return value === true || value === 1;
  }

  private normalizeMedida(value: Material['medida']): number {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  private toDateInputValue(value: string): string {
    return value.includes('T') ? value.split('T')[0] : value;
  }

  private getCategoriaNombre(categoria: Categoria): string {
    return categoria.nombre_categoria ?? categoria.nombre ?? 'Categoria';
  }

  private getColorNombre(color: Color): string {
    return color.nombre_color ?? color.nombre ?? 'Color';
  }
}
