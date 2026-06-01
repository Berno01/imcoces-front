import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ObraCardViewModel {
  id_obra: number | null;
  nombre_obra: string;
  ubicacion: string;
  progreso: number;
  diasRestantes: number;
  badgeLabel: string;
  vencida: boolean;
}

@Component({
  selector: 'app-obra-card',
  standalone: true,
  template: `
    <article
      class="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(15,23,42,0.1)]"
    >
      <div class="flex items-start justify-between gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-blue-700"
        >
          <svg
            class="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 10.5 12 3l8.25 7.5M5.25 9.75V21h13.5V9.75M9 21v-6h6v6"
            ></path>
          </svg>
        </div>

        <div
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
          [class.bg-amber-100]="!obra.vencida"
          [class.text-amber-700]="!obra.vencida"
          [class.bg-rose-100]="obra.vencida"
          [class.text-rose-700]="obra.vencida"
        >
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          {{ obra.badgeLabel }}
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
          title="Editar obra"
          (click)="editar.emit(obra.id_obra)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.687a1.875 1.875 0 1 1 2.651 2.651L8.062 18.59a4.5 4.5 0 0 1-1.897 1.13L4.5 20l.28-1.666a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487Z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 6 18 9" />
          </svg>
        </button>
      </div>

      <div class="mt-7 space-y-1.5">
        <h3 class="text-xl font-semibold text-slate-900">{{ obra.nombre_obra }}</h3>
        <p class="flex items-center gap-1.5 text-sm text-slate-500">
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
              d="M12 21s6-4.9 6-11a6 6 0 1 0-12 0c0 6.1 6 11 6 11Z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
            />
          </svg>
          {{ obra.ubicacion }}
        </p>
      </div>

      <div class="mt-7">
        <div
          class="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400"
        >
          <span>Progreso</span>
          <span class="text-lg tracking-normal text-blue-700">{{ obra.progreso }}%</span>
        </div>

        <div class="mt-3 h-2 rounded-full bg-slate-200">
          <div
            class="h-2 rounded-full bg-blue-700 transition-all duration-300"
            [style.width.%]="obra.progreso"
          ></div>
        </div>
      </div>

      <button
        type="button"
        class="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        (click)="verDetalle.emit(obra.id_obra)"
      >
        Ver Detalle
        <svg
          class="h-4 w-4 transition group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m0 0-5-5m5 5-5 5" />
        </svg>
      </button>
    </article>
  `,
})
export class ObraCardComponent {
  @Input({ required: true }) obra!: ObraCardViewModel;
  @Output() verDetalle = new EventEmitter<number | null>();
  @Output() editar = new EventEmitter<number | null>();
}
