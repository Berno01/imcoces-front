import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ObraUpdatePayload } from '../obra.interfaces';
import { ObraService } from '../obra.service';

interface EditWorkFormState {
  nombre_obra: string;
  nombre_cliente: string;
  num_cel: string;
  ubicacion: string;
  fecha_inicio: string;
  fecha_fin: string;
  metros_cuadrados: string;
}

@Component({
  selector: 'app-obra-edit-modal',
  standalone: true,
  template: `
    @if (obraIdInput() > 0) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      >
        <section
          class="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
        >
          <header
            class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
          >
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                Obra / Edición
              </p>
              <h2 class="mt-2 text-2xl font-black text-slate-950">Editar obra</h2>
              <p class="mt-1 text-sm text-slate-500">
                Cambia solo los datos principales. La sucursal se mantiene sin cambios.
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
                Cargando datos de la obra...
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
                  />
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
                class="mt-5 rounded-3xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700"
              >
                Si cambias los metros cuadrados, el sistema actualizará el total y el saldo por la
                diferencia.
              </div>
            }
          </div>

          <footer class="border-t border-slate-200 px-6 py-4">
            <div class="flex flex-wrap justify-end gap-3">
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
                {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    }
  `,
})
export class ObraEditModalComponent {
  private readonly obraService = inject(ObraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly obraIdInput = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly form = signal<EditWorkFormState>({
    nombre_obra: '',
    nombre_cliente: '',
    num_cel: '',
    ubicacion: '',
    fecha_inicio: '',
    fecha_fin: '',
    metros_cuadrados: '',
  });

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly updated = new EventEmitter<void>();

  @Input()
  set obraId(value: number | null | undefined) {
    const parsed = this.toNumber(value);
    this.obraIdInput.set(parsed);

    if (parsed > 0) {
      this.loadData(parsed);
    }
  }

  get obraId(): number {
    return this.obraIdInput();
  }

  setField(field: keyof EditWorkFormState, value: unknown): void {
    this.form.update((current) => ({
      ...current,
      [field]: this.toText(value),
    }));
  }

  canSubmit(): boolean {
    const form = this.form();
    return (
      this.toText(form.nombre_obra).length > 0 &&
      this.toText(form.nombre_cliente).length > 0 &&
      this.toText(form.fecha_inicio).length > 0 &&
      this.toNumber(form.metros_cuadrados) > 0
    );
  }

  submit(): void {
    const validationError = this.getValidationError();

    if (validationError) {
      this.validationError.set(validationError);
      return;
    }

    const payload: ObraUpdatePayload = {
      id_obra: this.obraIdInput(),
      nombre_obra: this.toText(this.form().nombre_obra),
      nombre_cliente: this.toText(this.form().nombre_cliente),
      num_cel: this.toText(this.form().num_cel),
      ubicacion: this.toText(this.form().ubicacion),
      fecha_inicio: this.toText(this.form().fecha_inicio),
      fecha_fin:
        this.toText(this.form().fecha_fin).length > 0 ? this.toText(this.form().fecha_fin) : null,
      metros_cuadrados: this.toNumber(this.form().metros_cuadrados),
      materiales: [],
      personales: [],
      herramientas: [],
    };

    this.saving.set(true);
    this.validationError.set(null);
    this.error.set(null);

    this.obraService
      .updateObra(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => this.updated.emit(),
        error: () => {
          this.error.set('No se pudo actualizar la obra.');
        },
      });
  }

  private loadData(idObra: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.obraService
      .getObraDetalle(idObra)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (detalle) => {
          const data = detalle.data;

          if (!data) {
            this.error.set('La obra no devolvio informacion para editar.');
            return;
          }

          this.form.set({
            nombre_obra: this.toText(data.nombre_obra),
            nombre_cliente: this.toText(data.nombre_cliente),
            num_cel: this.toText(data.num_cel),
            ubicacion: this.toText(data.ubicacion),
            fecha_inicio: this.toText(data.fecha_inicio),
            fecha_fin: this.toText(data.fecha_fin),
            metros_cuadrados: String(this.toNumber(data.metros_cuadrados)),
          });
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos de la obra.');
        },
      });
  }

  private getValidationError(): string | null {
    const form = this.form();

    if (this.toText(form.nombre_obra).length === 0) {
      return 'Ingresa el nombre de la obra.';
    }

    if (this.toText(form.nombre_cliente).length === 0) {
      return 'Ingresa el nombre del cliente.';
    }

    if (this.toText(form.fecha_inicio).length === 0) {
      return 'Selecciona la fecha de inicio.';
    }

    if (this.toNumber(form.metros_cuadrados) <= 0) {
      return 'Ingresa los metros cuadrados de la obra.';
    }

    return null;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
