import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ObraResumen } from './obra.interfaces';
import { ObraCardComponent, ObraCardViewModel } from './components/obra-card.component';
import { ObraCreateModalComponent } from './components/obra-create-modal.component';
import { ObraEditModalComponent } from './components/obra-edit-modal.component';
import { ObraService } from './obra.service';

interface ObraSummaryStats {
  total: number;
  promedio: number;
  finalizadas: number;
  vencidas: number;
  activas: number;
}

@Component({
  selector: 'app-obra-home',
  standalone: true,
  imports: [ObraCardComponent, ObraCreateModalComponent, ObraEditModalComponent],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-3">
          <p class="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">Obra</p>
          <h1 class="max-w-3xl text-4xl font-black leading-[0.95] text-slate-950 sm:text-5xl">
            Construyendo el futuro de manera precisa.
          </h1>
          <p class="max-w-2xl text-base leading-7 text-slate-500">
            Primer vistazo del módulo de obra. Aquí se listan las obras en curso y se calcula el
            progreso usando las fechas de inicio, fin y la fecha actual de Bolivia.
          </p>
        </div>

        <button
          type="button"
          (click)="openCreateModal()"
          class="inline-flex items-center gap-3 self-start rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700"
        >
          Nuevo Proyecto
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 text-lg leading-none"
          >
            +
          </span>
        </button>
      </header>

      @if (loading()) {
        <div
          class="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm"
        >
          Cargando obras...
        </div>
      } @else if (error()) {
        <div
          class="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700"
        >
          {{ error() }}
        </div>
      } @else if (obras().length === 0) {
        <div
          class="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm"
        >
          Aún no hay obras registradas.
        </div>
      } @else {
        <div class="grid gap-6 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr]">
          @for (obra of obras(); track obra.id_obra ?? obra.nombre_obra) {
            <app-obra-card
              [obra]="obra"
              (verDetalle)="onVerDetalle($event)"
              (editar)="onEditarObra($event)"
            />
          }

          <article
            class="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 via-blue-700 to-blue-900 p-6 text-white shadow-[0_20px_60px_rgba(29,78,216,0.35)] xl:col-span-2"
          >
            <div class="absolute inset-0 opacity-30">
              <div
                class="absolute -right-20 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl"
              ></div>
              <div
                class="absolute bottom-0 left-16 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl"
              ></div>
            </div>

            <div class="relative space-y-6">
              <p class="text-xs font-bold uppercase tracking-[0.28em] text-blue-100/80">
                Resumen de operaciones
              </p>
              <div class="space-y-2">
                <h2 class="text-3xl font-black">Estado Global de Obra</h2>
                <p class="max-w-2xl text-sm leading-6 text-blue-100/85">
                  Indicadores rápidos calculados desde el listado principal para tener un panorama
                  inmediato del avance del módulo.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p class="text-3xl font-black">{{ stats().total }}</p>
                  <p
                    class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80"
                  >
                    Proyectos activos
                  </p>
                </div>
                <div>
                  <p class="text-3xl font-black">{{ stats().promedio }}%</p>
                  <p
                    class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80"
                  >
                    Eficiencia promedio
                  </p>
                </div>
                <div>
                  <p class="text-3xl font-black">{{ stats().activas }}</p>
                  <p
                    class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80"
                  >
                    En curso
                  </p>
                </div>
                <div>
                  <p class="text-3xl font-black">{{ stats().finalizadas }}</p>
                  <p
                    class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80"
                  >
                    Finalizadas
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 pt-2 text-sm text-blue-50/90">
                <div class="flex -space-x-2">
                  <span class="h-10 w-10 rounded-full border-2 border-blue-700 bg-white/25"></span>
                  <span class="h-10 w-10 rounded-full border-2 border-blue-700 bg-white/20"></span>
                  <span class="h-10 w-10 rounded-full border-2 border-blue-700 bg-white/15"></span>
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-700 bg-white/20 text-xs font-bold"
                  >
                    +{{ extraTeamCount() }}
                  </span>
                </div>
                <span>Equipo asignado en campo actualmente.</span>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p class="text-xs uppercase tracking-[0.2em] text-blue-100/70">Vencidas</p>
                  <p class="mt-1 text-2xl font-black">{{ stats().vencidas }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p class="text-xs uppercase tracking-[0.2em] text-blue-100/70">Pendientes</p>
                  <p class="mt-1 text-2xl font-black">{{ stats().activas }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p class="text-xs uppercase tracking-[0.2em] text-blue-100/70">Hoy</p>
                  <p class="mt-1 text-2xl font-black">{{ todayLabel }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      }

      @if (isCreateModalOpen()) {
        <app-obra-create-modal (close)="closeCreateModal()" (created)="handleObraCreated()" />
      }

      @if (selectedEditObraId() > 0) {
        <app-obra-edit-modal
          [obraId]="selectedEditObraId()"
          (close)="closeEditModal()"
          (updated)="handleObraUpdated()"
        />
      }
    </section>
  `,
})
export class ObraHomeComponent implements OnInit {
  private readonly obraService = inject(ObraService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly obras = signal<ObraCardViewModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isCreateModalOpen = signal(false);
  readonly selectedEditObraId = signal(0);

  readonly stats = computed<ObraSummaryStats>(() => {
    const obras = this.obras();

    if (obras.length === 0) {
      return {
        total: 0,
        promedio: 0,
        finalizadas: 0,
        vencidas: 0,
        activas: 0,
      };
    }

    const totalProgress = obras.reduce((acumulado, obra) => acumulado + obra.progreso, 0);
    const finalizadas = obras.filter((obra) => obra.progreso >= 100).length;
    const vencidas = obras.filter((obra) => obra.vencida).length;

    return {
      total: obras.length,
      promedio: Math.round(totalProgress / obras.length),
      finalizadas,
      vencidas,
      activas: obras.length - finalizadas,
    };
  });

  readonly extraTeamCount = computed(() => {
    const total = this.stats().total;
    return total > 3 ? total - 3 : 0;
  });

  readonly todayLabel = this.getTodayLabel();

  ngOnInit(): void {
    this.loadObras();
  }

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  handleObraCreated(): void {
    this.closeCreateModal();
    this.loadObras();
  }

  onEditarObra(idObra: number | null): void {
    const normalizedId = this.toNumber(idObra);

    if (normalizedId <= 0) {
      return;
    }

    this.selectedEditObraId.set(normalizedId);
  }

  closeEditModal(): void {
    this.selectedEditObraId.set(0);
  }

  handleObraUpdated(): void {
    this.closeEditModal();
    this.loadObras();
  }

  loadObras(): void {
    this.loading.set(true);
    this.error.set(null);

    this.obraService
      .getObras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.obras.set((response.data ?? []).map((obra) => this.toCardViewModel(obra)));
        },
        error: () => {
          this.error.set('No se pudieron cargar las obras.');
        },
      });
  }

  onVerDetalle(idObra: number | null): void {
    if (!idObra) {
      return;
    }

    void this.router.navigateByUrl(`/obra/detalle/${idObra}`);
  }

  private toCardViewModel(obra: ObraResumen): ObraCardViewModel {
    const inicioKey = this.dateKey(obra.fecha_inicio);
    const finKey = this.dateKey(obra.fecha_fin);
    const hoyKey = this.getTodayKey();

    const progreso = this.calculateProgress(inicioKey, finKey, hoyKey);
    const diasRestantes = this.calculateDaysRemaining(finKey, hoyKey);

    return {
      id_obra: this.toNumber(obra.id_obra),
      nombre_obra: this.toText(obra.nombre_obra),
      ubicacion: this.toText(obra.ubicacion),
      progreso,
      diasRestantes,
      badgeLabel: this.buildBadgeLabel(diasRestantes),
      vencida: diasRestantes < 0,
    };
  }

  private calculateProgress(inicioKey: number, finKey: number, hoyKey: number): number {
    if (!Number.isFinite(inicioKey) || !Number.isFinite(finKey) || finKey <= inicioKey) {
      return 0;
    }

    if (hoyKey <= inicioKey) {
      return 0;
    }

    if (hoyKey >= finKey) {
      return 100;
    }

    const progress = ((hoyKey - inicioKey) / (finKey - inicioKey)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  private calculateDaysRemaining(finKey: number, hoyKey: number): number {
    if (!Number.isFinite(finKey) || !Number.isFinite(hoyKey)) {
      return 0;
    }

    return Math.ceil((finKey - hoyKey) / 86_400_000);
  }

  private buildBadgeLabel(diasRestantes: number): string {
    if (diasRestantes < 0) {
      return 'VENCIDA';
    }

    if (diasRestantes === 0) {
      return 'HOY VENCE';
    }

    if (diasRestantes === 1) {
      return '1 DÍA RESTANTE';
    }

    return `${diasRestantes} DÍAS RESTANTES`;
  }

  private getTodayLabel(): string {
    const today = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());

    return today;
  }

  private getTodayKey(): number {
    return this.dateKey(this.getTodayIsoDate());
  }

  private getTodayIsoDate(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(new Date());
  }

  private dateKey(value: string): number {
    const normalized = this.toText(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

    if (!match) {
      return 0;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    return Date.UTC(year, month - 1, day);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
