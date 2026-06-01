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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';

import { Sucursal } from '../../shared/sucursal/sucursal.interfaces';
import { SucursalService } from '../../shared/sucursal/sucursal.service';
import {
  ObraCreatePayload,
  ObraHerramientaDisponible,
  ObraMaterialDisponible,
  ObraPersonalDisponible,
} from '../obra.interfaces';
import { ObraService } from '../obra.service';

type CreateWorkStep = 'general' | 'materiales' | 'personales' | 'herramientas';

interface CreateWorkFormState {
  nombre_obra: string;
  nombre_cliente: string;
  num_cel: string;
  ubicacion: string;
  id_sucursal: string;
  fecha_inicio: string;
  fecha_fin: string;
  metros_cuadrados: string;
}

@Component({
  selector: 'app-obra-create-modal',
  standalone: true,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
    >
      <section
        class="w-full max-w-7xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
              Obra / Alta
            </p>
            <h2 class="mt-2 text-2xl font-black text-slate-950">Crear nueva obra</h2>
            <p class="mt-1 text-sm text-slate-500">
              Completa los datos generales y selecciona al menos un material, un personal y una
              herramienta.
            </p>
          </div>

          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
            (click)="close.emit()"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="border-b border-slate-200 px-6 py-4">
          <div class="flex flex-wrap gap-2">
            @for (step of steps; track step.id) {
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-semibold transition"
                [class.bg-blue-700]="activeStep() === step.id"
                [class.text-white]="activeStep() === step.id"
                [class.shadow-sm]="activeStep() === step.id"
                [class.bg-slate-100]="activeStep() !== step.id"
                [class.text-slate-600]="activeStep() !== step.id"
                (click)="activeStep.set(step.id)"
              >
                {{ step.label }}
              </button>
            }
          </div>
        </div>

        <div class="max-h-[calc(88vh-190px)] overflow-y-auto px-6 py-6">
          @if (loading()) {
            <div
              class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
            >
              Cargando catálogos para crear la obra...
            </div>
          } @else {
            @if (error()) {
              <div
                class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {{ error() }}
              </div>
            }

            @if (validationError()) {
              <div
                class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
              >
                {{ validationError() }}
              </div>
            }

            <div [hidden]="activeStep() !== 'general'" class="space-y-4">
              <div class="grid gap-4 lg:grid-cols-2">
                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Nombre de obra</span
                  >
                  <input
                    type="text"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().nombre_obra"
                    (input)="setField('nombre_obra', $any($event.target).value)"
                    placeholder="Proyecto Centro"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Cliente</span
                  >
                  <input
                    type="text"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().nombre_cliente"
                    (input)="setField('nombre_cliente', $any($event.target).value)"
                    placeholder="Pablo Paerres"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Número celular</span
                  >
                  <input
                    type="text"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().num_cel"
                    (input)="setField('num_cel', $any($event.target).value)"
                    placeholder="77777777"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Ubicación</span
                  >
                  <input
                    type="text"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().ubicacion"
                    (input)="setField('ubicacion', $any($event.target).value)"
                    placeholder="Zona Centro"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Sucursal</span
                  >
                  <select
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().id_sucursal"
                    (change)="setSucursal($any($event.target).value)"
                  >
                    <option value="">Selecciona una sucursal</option>
                    @for (sucursal of sucursales(); track sucursal.id_sucursal) {
                      <option [value]="sucursal.id_sucursal">{{ sucursal.nombre }}</option>
                    }
                  </select>
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Metros cuadrados</span
                  >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().metros_cuadrados"
                    (input)="setField('metros_cuadrados', $any($event.target).value)"
                    placeholder="150"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Fecha inicio</span
                  >
                  <input
                    type="date"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().fecha_inicio"
                    (input)="setField('fecha_inicio', $any($event.target).value)"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >Fecha fin</span
                  >
                  <input
                    type="date"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                    [value]="form().fecha_fin"
                    (input)="setField('fecha_fin', $any($event.target).value)"
                  />
                </label>
              </div>

              <div
                class="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700"
              >
                La sucursal seleccionada define los materiales y herramientas disponibles para la
                obra.
              </div>
            </div>

            <div [hidden]="activeStep() !== 'materiales'" class="space-y-4">
              @if (selectedSucursalId() <= 0) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  Primero selecciona una sucursal en la pestaña de datos generales.
                </div>
              } @else if (catalogsLoading()) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  Cargando materiales disponibles...
                </div>
              } @else if (availableMaterials().length === 0) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  No hay materiales disponibles para la sucursal seleccionada.
                </div>
              } @else {
                <div
                  class="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                >
                  Selecciona al menos un material y define la cantidad que se usará en la obra.
                </div>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  @for (material of availableMaterials(); track material.id_material) {
                    <article
                      class="rounded-[24px] border p-4 transition"
                      [class.border-blue-500]="isMaterialSelected(material.id_material)"
                      [class.bg-white]="isMaterialSelected(material.id_material)"
                      [class.border-slate-200]="!isMaterialSelected(material.id_material)"
                      [class.bg-slate-50]="!isMaterialSelected(material.id_material)"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-base font-black text-slate-950">
                            {{ material.nombre }}
                          </p>
                          <p
                            class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                          >
                            {{ material.codigo }} · {{ material.medida }}
                          </p>
                        </div>

                        <span
                          class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
                        >
                          Stock: {{ material.cantidad }}
                        </span>
                      </div>

                      <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div class="rounded-2xl bg-slate-100 px-3 py-2">
                          Precio: {{ formatMoney(material.precio) }}
                        </div>
                        <div class="rounded-2xl bg-slate-100 px-3 py-2">
                          Costo: {{ formatMoney(material.costo) }}
                        </div>
                      </div>

                      @if (isMaterialSelected(material.id_material)) {
                        <div class="mt-4 space-y-2">
                          <label
                            class="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                            >Cantidad usada</label
                          >
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            [max]="material.cantidad"
                            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                            [value]="getMaterialQuantity(material.id_material)"
                            (input)="
                              setMaterialQuantity(material.id_material, $any($event.target).value)
                            "
                            placeholder="1"
                          />
                        </div>
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                          (click)="toggleMaterial(material)"
                        >
                          Quitar material
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                          (click)="toggleMaterial(material)"
                        >
                          Agregar material
                        </button>
                      }
                    </article>
                  }
                </div>
              }
            </div>

            <div [hidden]="activeStep() !== 'personales'" class="space-y-4">
              @if (availablePersonales().length === 0) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  No hay personal disponible para asignar.
                </div>
              } @else {
                <div
                  class="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                >
                  Selecciona al menos un personal y define el pago acordado para cada uno.
                </div>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  @for (personal of availablePersonales(); track personal.id_usuario) {
                    <article
                      class="rounded-[24px] border p-4 transition"
                      [class.border-blue-500]="isPersonalSelected(personal.id_usuario)"
                      [class.bg-white]="isPersonalSelected(personal.id_usuario)"
                      [class.border-slate-200]="!isPersonalSelected(personal.id_usuario)"
                      [class.bg-slate-50]="!isPersonalSelected(personal.id_usuario)"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-base font-black text-slate-950">
                            {{ fullName(personal) }}
                          </p>
                          <p class="text-sm text-slate-500">{{ personal.login }}</p>
                        </div>

                        <span
                          class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
                          [class.bg-emerald-100]="isActive(personal)"
                          [class.text-emerald-700]="isActive(personal)"
                          [class.bg-slate-200]="!isActive(personal)"
                          [class.text-slate-600]="!isActive(personal)"
                        >
                          {{ isActive(personal) ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>

                      @if (isPersonalSelected(personal.id_usuario)) {
                        <div class="mt-4 space-y-2">
                          <label
                            class="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                            >Pago acordado</label
                          >
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                            [value]="getPersonalAgreement(personal.id_usuario)"
                            (input)="
                              setPersonalAgreement(personal.id_usuario, $any($event.target).value)
                            "
                            placeholder="800"
                          />
                        </div>
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                          (click)="togglePersonal(personal)"
                        >
                          Quitar personal
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                          (click)="togglePersonal(personal)"
                        >
                          Agregar personal
                        </button>
                      }
                    </article>
                  }
                </div>
              }
            </div>

            <div [hidden]="activeStep() !== 'herramientas'" class="space-y-4">
              @if (selectedSucursalId() <= 0) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  Primero selecciona una sucursal en la pestaña de datos generales.
                </div>
              } @else if (catalogsLoading()) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  Cargando herramientas disponibles...
                </div>
              } @else if (availableTools().length === 0) {
                <div
                  class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
                >
                  No hay herramientas disponibles para la sucursal seleccionada.
                </div>
              } @else {
                <div
                  class="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                >
                  Selecciona al menos una herramienta y define la cantidad asignada.
                </div>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  @for (tool of availableTools(); track tool.id_herramienta) {
                    <article
                      class="rounded-[24px] border p-4 transition"
                      [class.border-blue-500]="isToolSelected(tool.id_herramienta)"
                      [class.bg-white]="isToolSelected(tool.id_herramienta)"
                      [class.border-slate-200]="!isToolSelected(tool.id_herramienta)"
                      [class.bg-slate-50]="!isToolSelected(tool.id_herramienta)"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-base font-black text-slate-950">
                            {{ tool.nombre }}
                          </p>
                          <p
                            class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                          >
                            {{ tool.nombre_categoria_herramienta }}
                          </p>
                        </div>

                        <span
                          class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
                        >
                          Disponible: {{ tool.cantidad_disponible }}
                        </span>
                      </div>

                      @if (isToolSelected(tool.id_herramienta)) {
                        <div class="mt-4 space-y-2">
                          <label
                            class="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                            >Cantidad asignada</label
                          >
                          <input
                            type="number"
                            min="1"
                            step="1"
                            [max]="tool.cantidad_disponible"
                            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                            [value]="getToolQuantity(tool.id_herramienta)"
                            (input)="
                              setToolQuantity(tool.id_herramienta, $any($event.target).value)
                            "
                            placeholder="1"
                          />
                        </div>
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                          (click)="toggleTool(tool)"
                        >
                          Quitar herramienta
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                          (click)="toggleTool(tool)"
                        >
                          Agregar herramienta
                        </button>
                      }
                    </article>
                  }
                </div>
              }
            </div>
          }
        </div>

        <footer class="border-t border-slate-200 px-6 py-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              class="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
            >
              <span class="rounded-full bg-slate-100 px-3 py-2"
                >Materiales: {{ selectedMaterialCount() }}</span
              >
              <span class="rounded-full bg-slate-100 px-3 py-2"
                >Personales: {{ selectedPersonalCount() }}</span
              >
              <span class="rounded-full bg-slate-100 px-3 py-2"
                >Herramientas: {{ selectedToolCount() }}</span
              >
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                (click)="close.emit()"
              >
                Cancelar
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                [disabled]="saving() || !canSubmit()"
                (click)="submit()"
              >
                {{ saving() ? 'Creando...' : 'Crear obra' }}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  `,
})
export class ObraCreateModalComponent implements OnInit {
  private readonly obraService = inject(ObraService);
  private readonly sucursalService = inject(SucursalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps: Array<{ id: CreateWorkStep; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'materiales', label: 'Materiales' },
    { id: 'personales', label: 'Personal' },
    { id: 'herramientas', label: 'Herramientas' },
  ];

  readonly activeStep = signal<CreateWorkStep>('general');
  readonly loading = signal(false);
  readonly catalogsLoading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = signal<CreateWorkFormState>({
    nombre_obra: '',
    nombre_cliente: '',
    num_cel: '',
    ubicacion: '',
    id_sucursal: '',
    fecha_inicio: this.getTodayIsoDate(),
    fecha_fin: '',
    metros_cuadrados: '',
  });
  readonly sucursales = signal<Sucursal[]>([]);
  readonly personales = signal<ObraPersonalDisponible[]>([]);
  readonly materiales = signal<ObraMaterialDisponible[]>([]);
  readonly herramientas = signal<ObraHerramientaDisponible[]>([]);
  readonly selectedPersonalIds = signal<Record<number, boolean>>({});
  readonly personalAgreementById = signal<Record<number, string>>({});
  readonly selectedMaterialIds = signal<Record<number, boolean>>({});
  readonly materialQuantityById = signal<Record<number, string>>({});
  readonly selectedToolIds = signal<Record<number, boolean>>({});
  readonly toolQuantityById = signal<Record<number, string>>({});

  readonly selectedSucursalId = computed(() => this.toNumber(this.form().id_sucursal));

  readonly availablePersonales = computed(() =>
    this.personales().filter((personal) => this.isActive(personal)),
  );

  readonly selectedPersonalCount = computed(() => Object.keys(this.selectedPersonalIds()).length);
  readonly selectedMaterialCount = computed(() => Object.keys(this.selectedMaterialIds()).length);
  readonly selectedToolCount = computed(() => Object.keys(this.selectedToolIds()).length);

  readonly selectedMaterials = computed(() =>
    this.materiales().filter((material) => this.isMaterialSelected(material.id_material)),
  );

  readonly selectedPersonales = computed(() =>
    this.availablePersonales().filter((personal) => this.isPersonalSelected(personal.id_usuario)),
  );

  readonly selectedTools = computed(() =>
    this.herramientas().filter((tool) => this.isToolSelected(tool.id_herramienta)),
  );

  readonly validationError = computed(() => this.getValidationError());

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly created = new EventEmitter<void>();

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    this.form.update((current) => ({
      ...current,
      id_sucursal: String(this.toNumber(this.sucursalService.selectedSucursalId())),
    }));

    forkJoin({
      sucursales: this.sucursalService.loadSucursales(),
      personales: this.obraService.getObraPersonal(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ sucursales, personales }) => {
          this.sucursales.set(sucursales ?? []);
          this.personales.set(personales.data ?? []);

          const idSucursal = this.selectedSucursalId();
          if (idSucursal > 0) {
            this.loadCatalogs(idSucursal);
          }
        },
        error: () => {
          this.error.set('No se pudo cargar la información inicial para crear la obra.');
        },
      });
  }

  setField(field: keyof CreateWorkFormState, value: unknown): void {
    const textValue = this.toText(value);

    this.form.update((current) => ({
      ...current,
      [field]: textValue,
    }));
  }

  setSucursal(value: unknown): void {
    const idSucursal = this.toNumber(value);

    this.form.update((current) => ({
      ...current,
      id_sucursal: idSucursal > 0 ? String(idSucursal) : '',
    }));

    this.clearCatalogSelections();

    if (idSucursal > 0) {
      this.loadCatalogs(idSucursal);
      return;
    }

    this.materiales.set([]);
    this.herramientas.set([]);
  }

  togglePersonal(personal: ObraPersonalDisponible): void {
    const idUsuario = this.toNumber(personal.id_usuario);
    if (idUsuario <= 0) {
      return;
    }

    this.selectedPersonalIds.update((current) => {
      const next = { ...current };
      if (next[idUsuario]) {
        delete next[idUsuario];
        this.personalAgreementById.update((agreement) => {
          const nextAgreement = { ...agreement };
          delete nextAgreement[idUsuario];
          return nextAgreement;
        });
        return next;
      }

      next[idUsuario] = true;
      this.personalAgreementById.update((agreement) => ({
        ...agreement,
        [idUsuario]: agreement[idUsuario] ?? '',
      }));
      return next;
    });
  }

  setPersonalAgreement(idUsuario: number, value: unknown): void {
    const normalizedId = this.toNumber(idUsuario);
    if (normalizedId <= 0) {
      return;
    }

    this.personalAgreementById.update((current) => ({
      ...current,
      [normalizedId]: this.toText(value),
    }));
  }

  isPersonalSelected(idUsuario: number): boolean {
    return !!this.selectedPersonalIds()[this.toNumber(idUsuario)];
  }

  getPersonalAgreement(idUsuario: number): string {
    return this.toText(this.personalAgreementById()[this.toNumber(idUsuario)] ?? '');
  }

  toggleMaterial(material: ObraMaterialDisponible): void {
    const idMaterial = this.toNumber(material.id_material);
    if (idMaterial <= 0) {
      return;
    }

    this.selectedMaterialIds.update((current) => {
      const next = { ...current };
      if (next[idMaterial]) {
        delete next[idMaterial];
        this.materialQuantityById.update((quantity) => {
          const nextQuantity = { ...quantity };
          delete nextQuantity[idMaterial];
          return nextQuantity;
        });
        return next;
      }

      next[idMaterial] = true;
      this.materialQuantityById.update((quantity) => ({
        ...quantity,
        [idMaterial]: quantity[idMaterial] ?? '1',
      }));
      return next;
    });
  }

  setMaterialQuantity(idMaterial: number, value: unknown): void {
    const normalizedId = this.toNumber(idMaterial);
    if (normalizedId <= 0) {
      return;
    }

    this.materialQuantityById.update((current) => ({
      ...current,
      [normalizedId]: this.toText(value),
    }));
  }

  isMaterialSelected(idMaterial: number): boolean {
    return !!this.selectedMaterialIds()[this.toNumber(idMaterial)];
  }

  getMaterialQuantity(idMaterial: number): string {
    return this.toText(this.materialQuantityById()[this.toNumber(idMaterial)] ?? '1');
  }

  toggleTool(tool: ObraHerramientaDisponible): void {
    const idHerramienta = this.toNumber(tool.id_herramienta);
    if (idHerramienta <= 0) {
      return;
    }

    this.selectedToolIds.update((current) => {
      const next = { ...current };
      if (next[idHerramienta]) {
        delete next[idHerramienta];
        this.toolQuantityById.update((quantity) => {
          const nextQuantity = { ...quantity };
          delete nextQuantity[idHerramienta];
          return nextQuantity;
        });
        return next;
      }

      next[idHerramienta] = true;
      this.toolQuantityById.update((quantity) => ({
        ...quantity,
        [idHerramienta]: quantity[idHerramienta] ?? '1',
      }));
      return next;
    });
  }

  setToolQuantity(idHerramienta: number, value: unknown): void {
    const normalizedId = this.toNumber(idHerramienta);
    if (normalizedId <= 0) {
      return;
    }

    this.toolQuantityById.update((current) => ({
      ...current,
      [normalizedId]: this.toText(value),
    }));
  }

  isToolSelected(idHerramienta: number): boolean {
    return !!this.selectedToolIds()[this.toNumber(idHerramienta)];
  }

  getToolQuantity(idHerramienta: number): string {
    return this.toText(this.toolQuantityById()[this.toNumber(idHerramienta)] ?? '1');
  }

  isActive(personal: ObraPersonalDisponible): boolean {
    if (typeof personal.estado === 'boolean') {
      return personal.estado;
    }

    return Number(personal.estado) === 1;
  }

  fullName(personal: ObraPersonalDisponible): string {
    const nombre = this.toText(personal.nombre);
    const apellidos = this.toText(personal.apellidos);

    return `${nombre} ${apellidos}`.trim() || `Usuario ${personal.id_usuario}`;
  }

  availableMaterials(): ObraMaterialDisponible[] {
    return this.materiales();
  }

  availableTools(): ObraHerramientaDisponible[] {
    return this.herramientas();
  }

  canSubmit(): boolean {
    return this.getValidationError() === null;
  }

  submit(): void {
    const validationError = this.getValidationError();
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.obraService
      .createObra(this.buildPayload())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.created.emit();
        },
        error: () => {
          this.error.set('No se pudo crear la obra. Revisa los datos enviados.');
        },
      });
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value));
  }

  private loadCatalogs(idSucursal: number): void {
    if (idSucursal <= 0) {
      return;
    }

    this.catalogsLoading.set(true);
    this.error.set(null);

    forkJoin({
      materiales: this.obraService.getObraMateriales(idSucursal),
      herramientas: this.obraService.getObraHerramientas(idSucursal),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.catalogsLoading.set(false)),
      )
      .subscribe({
        next: ({ materiales, herramientas }) => {
          this.materiales.set(materiales.data ?? []);
          this.herramientas.set(herramientas.data ?? []);
        },
        error: () => {
          this.materiales.set([]);
          this.herramientas.set([]);
          this.error.set(
            'No se pudieron cargar materiales y herramientas de la sucursal seleccionada.',
          );
        },
      });
  }

  private clearCatalogSelections(): void {
    this.selectedMaterialIds.set({});
    this.materialQuantityById.set({});
    this.selectedToolIds.set({});
    this.toolQuantityById.set({});
  }

  private getValidationError(): string | null {
    const form = this.form();

    if (this.toText(form.nombre_obra).length === 0) {
      return 'Ingresa el nombre de la obra.';
    }

    if (this.toText(form.nombre_cliente).length === 0) {
      return 'Ingresa el nombre del cliente.';
    }

    if (this.toText(form.id_sucursal).length === 0 || this.selectedSucursalId() <= 0) {
      return 'Selecciona una sucursal.';
    }

    if (this.toText(form.fecha_inicio).length === 0) {
      return 'Selecciona la fecha de inicio.';
    }

    if (this.toNumber(form.metros_cuadrados) <= 0) {
      return 'Ingresa los metros cuadrados de la obra.';
    }

    if (this.selectedMaterials().length < 1) {
      return 'Debes seleccionar al menos un material.';
    }

    if (this.selectedPersonales().length < 1) {
      return 'Debes seleccionar al menos un personal.';
    }

    if (this.selectedTools().length < 1) {
      return 'Debes seleccionar al menos una herramienta.';
    }

    for (const material of this.selectedMaterials()) {
      const quantity = this.toNumber(this.materialQuantityById()[material.id_material]);

      if (quantity <= 0) {
        return `La cantidad del material ${material.nombre} debe ser mayor a cero.`;
      }

      if (quantity > this.toNumber(material.cantidad)) {
        return `La cantidad del material ${material.nombre} no puede exceder el stock disponible.`;
      }
    }

    for (const personal of this.selectedPersonales()) {
      const agreement = this.toNumber(this.personalAgreementById()[personal.id_usuario]);

      if (agreement <= 0) {
        return `El pago acordado de ${this.fullName(personal)} debe ser mayor a cero.`;
      }
    }

    for (const tool of this.selectedTools()) {
      const quantity = this.toNumber(this.toolQuantityById()[tool.id_herramienta]);

      if (quantity <= 0) {
        return `La cantidad asignada de ${tool.nombre} debe ser mayor a cero.`;
      }

      if (quantity > this.toNumber(tool.cantidad_disponible)) {
        return `La herramienta ${tool.nombre} no tiene stock suficiente.`;
      }
    }

    return null;
  }

  private buildPayload(): ObraCreatePayload {
    const form = this.form();

    return {
      nombre_obra: this.toText(form.nombre_obra),
      nombre_cliente: this.toText(form.nombre_cliente),
      num_cel: this.toText(form.num_cel),
      ubicacion: this.toText(form.ubicacion),
      id_sucursal: this.toNumber(form.id_sucursal),
      fecha_inicio: this.toText(form.fecha_inicio),
      fecha_fin: this.toText(form.fecha_fin).length > 0 ? this.toText(form.fecha_fin) : null,
      metros_cuadrados: this.toNumber(form.metros_cuadrados),
      materiales: this.selectedMaterials().map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad_usada: this.toNumber(this.materialQuantityById()[material.id_material]),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      })),
      personales: this.selectedPersonales().map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(this.personalAgreementById()[personal.id_usuario]),
      })),
      herramientas: this.selectedTools().map((tool) => ({
        id_herramienta: this.toNumber(tool.id_herramienta),
        cantidad_asignada: this.toNumber(this.toolQuantityById()[tool.id_herramienta]),
      })),
    };
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

  private getTodayIsoDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
