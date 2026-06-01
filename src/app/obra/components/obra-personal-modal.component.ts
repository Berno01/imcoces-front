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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ObraPersonalDisponible, ObraPersonalSyncPayload } from '../obra.interfaces';
import { ObraService } from '../obra.service';

@Component({
  selector: 'app-obra-personal-modal',
  standalone: true,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
    >
      <section
        class="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
              Obra / Personal
            </p>
            <h2 class="mt-2 text-2xl font-black text-slate-950">Asignar personal disponible</h2>
            <p class="mt-1 text-sm text-slate-500">
              Usuarios disponibles para seleccionar y vincular a la obra.
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

        <div class="max-h-[calc(88vh-92px)] overflow-y-auto px-6 py-6">
          @if (loading()) {
            <div
              class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
            >
              Cargando personal disponible...
            </div>
          } @else if (error()) {
            <div
              class="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700"
            >
              {{ error() }}
            </div>
          } @else if (availablePersonales().length === 0) {
            <div
              class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500"
            >
              No hay otros trabajadores disponibles para asignar.
            </div>
          } @else {
            <div
              class="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
            >
              Selecciona uno o varios trabajadores y escribe el acuerdo por cada uno. El card
              seleccionado se guarda para poder enviar varios en una sola petición.
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (personal of availablePersonales(); track personal.id_usuario) {
                <article
                  class="cursor-pointer rounded-[24px] border p-4 transition hover:border-blue-200 hover:bg-white"
                  [class.border-blue-500]="isSelected(personal.id_usuario)"
                  [class.bg-white]="isSelected(personal.id_usuario)"
                  [class.border-slate-200]="!isSelected(personal.id_usuario)"
                  [class.bg-slate-50]="!isSelected(personal.id_usuario)"
                  (click)="toggleSelected(personal)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-lg font-black text-slate-950">
                        {{ fullName(personal) }}
                      </p>
                      <p class="mt-1 text-sm text-slate-500">{{ getRoleLabel(personal.id_rol) }}</p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
                      [class.bg-emerald-100]="isActive(personal)"
                      [class.text-emerald-700]="isActive(personal)"
                      [class.bg-slate-200]="!isActive(personal)"
                      [class.text-slate-600]="!isActive(personal)"
                    >
                      {{ isActive(personal) ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>

                  <div class="mt-4 space-y-2 text-sm text-slate-600">
                    <p class="flex items-center gap-2">
                      <svg
                        class="h-4 w-4 text-blue-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.25 6.75c0 7.456 6.044 13.5 13.5 13.5h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.036a1.125 1.125 0 0 0-.75-1.06l-4.128-1.376a1.125 1.125 0 0 0-1.125.28l-.947.947a12.042 12.042 0 0 1-5.688-5.688l.947-.947a1.125 1.125 0 0 0 .28-1.125L8.346 3.75a1.125 1.125 0 0 0-1.06-.75H6.75A2.25 2.25 0 0 0 4.5 5.25v1.5Z"
                        />
                      </svg>
                      {{ personal.num_cel }}
                    </p>
                    <p class="flex items-center gap-2">
                      <svg
                        class="h-4 w-4 text-blue-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                        />
                      </svg>
                      ID Usuario: {{ personal.id_usuario }}
                    </p>
                  </div>

                  @if (isSelected(personal.id_usuario)) {
                    <div class="mt-4 space-y-2" (click)="$event.stopPropagation()">
                      <label
                        class="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                      >
                        Acuerdo en Bs
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400"
                        [value]="getAgreement(personal.id_usuario)"
                        (input)="setAgreement(personal.id_usuario, $any($event.target).value)"
                        placeholder="0.00"
                      />
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                      (click)="$event.stopPropagation(); toggleSelected(personal)"
                    >
                      Asignar
                    </button>
                  }
                </article>
              }
            </div>
          }
        </div>

        <footer class="border-t border-slate-200 px-6 py-4">
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm text-slate-500">
              {{ selectedCount() }} trabajador(es) seleccionado(s)
            </p>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              [disabled]="selectedCount() === 0"
              (click)="emitSelection()"
            >
              Asignar seleccionados
            </button>
          </div>
        </footer>
      </section>
    </div>
  `,
})
export class ObraPersonalModalComponent implements OnInit {
  private readonly obraService = inject(ObraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly personales = signal<ObraPersonalDisponible[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly assignedUserIdsInput = signal<number[]>([]);
  readonly selectedUserIds = signal<Record<number, boolean>>({});
  readonly agreementByUserId = signal<Record<number, number>>({});
  readonly obraIdInput = signal<number>(0);

  readonly availablePersonales = computed(() => {
    const assignedUserIds = new Set(
      this.assignedUserIdsInput().map((idUsuario) => this.toNumber(idUsuario)),
    );

    return this.personales().filter(
      (personal) => !assignedUserIds.has(this.toNumber(personal.id_usuario)),
    );
  });

  readonly selectedCount = computed(() => Object.keys(this.selectedUserIds()).length);

  @Input()
  set obraId(value: number | null | undefined) {
    this.obraIdInput.set(this.toNumber(value));
  }

  get obraId(): number {
    return this.obraIdInput();
  }

  @Input()
  set assignedUserIds(value: number[] | null | undefined) {
    this.assignedUserIdsInput.set(
      Array.isArray(value)
        ? value.map((idUsuario) => this.toNumber(idUsuario)).filter((idUsuario) => idUsuario > 0)
        : [],
    );

    this.pruneSelectedAgainstAssigned();
  }

  get assignedUserIds(): number[] {
    return this.assignedUserIdsInput();
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    this.obraService
      .getObraPersonal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.personales.set(response.data ?? []);
          this.pruneSelectedAgainstAssigned();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar el personal disponible.');
        },
      });
  }

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly assignSelected = new EventEmitter<ObraPersonalSyncPayload>();

  fullName(personal: ObraPersonalDisponible): string {
    const nombre = this.toText(personal.nombre);
    const apellidos = this.toText(personal.apellidos);
    return `${nombre} ${apellidos}`.trim() || `Usuario ${personal.id_usuario}`;
  }

  getRoleLabel(idRol: number): string {
    const roles: { [key: number]: string } = {
      2: 'Arquitecto',
      3: 'Vendedor',
      4: 'Tecnico',
      5: 'Ayudante',
    };

    return roles[idRol] ?? `Rol ${idRol}`;
  }

  isActive(personal: ObraPersonalDisponible): boolean {
    if (typeof personal.estado === 'boolean') {
      return personal.estado;
    }

    return Number(personal.estado) === 1;
  }

  isSelected(idUsuario: number): boolean {
    return Object.prototype.hasOwnProperty.call(this.selectedUserIds(), this.toNumber(idUsuario));
  }

  getAgreement(idUsuario: number): number {
    return this.toNumber(this.agreementByUserId()[this.toNumber(idUsuario)] ?? 0);
  }

  toggleSelected(personal: ObraPersonalDisponible): void {
    const idUsuario = this.toNumber(personal.id_usuario);

    if (idUsuario <= 0) {
      return;
    }

    this.selectedUserIds.update((current) => {
      const next = { ...current };

      if (Object.prototype.hasOwnProperty.call(next, idUsuario)) {
        delete next[idUsuario];
      } else {
        next[idUsuario] = true;
      }

      return next;
    });
  }

  setAgreement(idUsuario: number, rawValue: unknown): void {
    const parsed = this.toNumber(rawValue);
    const normalizedId = this.toNumber(idUsuario);

    if (normalizedId <= 0) {
      return;
    }

    this.agreementByUserId.update((current) => ({
      ...current,
      [normalizedId]: Math.max(parsed, 0),
    }));
  }

  emitSelection(): void {
    const selectedIds = Object.keys(this.selectedUserIds())
      .map((idUsuario) => this.toNumber(idUsuario))
      .filter((idUsuario) => idUsuario > 0);

    const personales = selectedIds
      .map((idUsuario) => ({
        id_usuario: idUsuario,
        pago_acordado: this.toNumber(this.agreementByUserId()[idUsuario] ?? 0),
      }))
      .filter((item) => item.id_usuario > 0);

    if (personales.length === 0) {
      return;
    }

    this.assignSelected.emit({
      id_obra: this.obraId,
      personales,
    });
  }

  private pruneSelectedAgainstAssigned(): void {
    const assignedUserIds = new Set(
      this.assignedUserIdsInput().map((idUsuario) => this.toNumber(idUsuario)),
    );
    const availableIds = new Set(
      this.availablePersonales().map((personal) => this.toNumber(personal.id_usuario)),
    );

    this.selectedUserIds.update((current) => {
      const next: Record<number, boolean> = {};

      for (const [idUsuario] of Object.entries(current)) {
        const numericId = this.toNumber(idUsuario);

        if (numericId > 0 && !assignedUserIds.has(numericId) && availableIds.has(numericId)) {
          next[numericId] = true;
        }
      }

      return next;
    });

    this.agreementByUserId.update((current) => {
      const next: Record<number, number> = {};

      for (const [idUsuario, pagoAcordado] of Object.entries(current)) {
        const numericId = this.toNumber(idUsuario);

        if (numericId > 0 && !assignedUserIds.has(numericId) && availableIds.has(numericId)) {
          next[numericId] = this.toNumber(pagoAcordado);
        }
      }

      return next;
    });
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
