import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ObraDeudorClienteItem } from './obra.interfaces';
import { ObraService } from './obra.service';

@Component({
  selector: 'app-obra-deudores',
  standalone: true,
  template: `
    <section class="space-y-6">
      <header
        class="rounded-[34px] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
      >
        <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
          Obra / Deudores
        </p>
        <div class="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-black text-slate-950">Deudores de obras</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Clientes con saldo pendiente agrupados por persona, con sus obras asociadas, saldo y
              fecha pactada.
            </p>
          </div>

          <div class="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Total acumulado
            </p>
            <p class="text-2xl font-black text-blue-700">{{ formatMoney(totalSaldo()) }}</p>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div
          class="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm"
        >
          Cargando deudores...
        </div>
      } @else if (error()) {
        <div
          class="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700"
        >
          {{ error() }}
        </div>
      } @else if (deudores().length === 0) {
        <div
          class="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm"
        >
          No hay deudores registrados actualmente.
        </div>
      } @else {
        <div class="grid gap-5 xl:grid-cols-2">
          @for (cliente of deudores(); track trackCliente($index, cliente)) {
            <article
              class="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4"
              >
                <div>
                  <p class="text-sm font-black uppercase tracking-[0.2em] text-blue-500">Cliente</p>
                  <h2 class="mt-1 text-2xl font-black text-slate-950">
                    {{ cliente.nombre_cliente }}
                  </h2>
                  <p class="mt-1 text-sm text-slate-500">{{ cliente.num_cel }}</p>
                </div>

                <div class="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Saldo acumulado
                  </p>
                  <p class="text-xl font-black text-rose-600">
                    {{ formatMoney(cliente.total_saldo_acumulado) }}
                  </p>
                </div>
              </header>

              <div class="space-y-3 px-5 py-5">
                @for (obra of cliente.obras; track obra.id_obra) {
                  <button
                    type="button"
                    class="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_12px_30px_rgba(37,99,235,0.08)]"
                    (click)="openObraPayments(obra.id_obra)"
                  >
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div class="min-w-0">
                        <p class="truncate text-lg font-black text-slate-950">
                          {{ obra.nombre_obra }}
                        </p>
                        <p class="mt-1 text-sm text-slate-500">
                          Fecha pactada: {{ formatDate(obra.fecha_pactada) }}
                        </p>
                      </div>

                      <div class="flex items-center gap-3">
                        <span
                          class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700"
                        >
                          {{ formatMoney(obra.saldo) }}
                        </span>
                        <span
                          class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700"
                        >
                          Ver pagos
                        </span>
                      </div>
                    </div>
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class ObraDeudoresComponent implements OnInit {
  private readonly obraService = inject(ObraService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deudores = signal<ObraDeudorClienteItem[]>([]);

  readonly totalSaldo = signal(0);

  ngOnInit(): void {
    this.loadDeudores();
  }

  loadDeudores(): void {
    this.loading.set(true);
    this.error.set(null);

    this.obraService
      .getObraDeudores()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const items = response.data ?? [];
          this.deudores.set(items);
          this.totalSaldo.set(
            items.reduce(
              (acumulado, cliente) => acumulado + this.toNumber(cliente.total_saldo_acumulado),
              0,
            ),
          );
        },
        error: () => {
          this.error.set('No se pudo cargar el listado de deudores.');
        },
      });
  }

  openObraPayments(idObra: number): void {
    const normalizedId = this.toNumber(idObra);

    if (normalizedId <= 0) {
      return;
    }

    void this.router.navigateByUrl(`/obra/detalle/pagos/${normalizedId}`);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value));
  }

  formatDate(value: string | null): string {
    const text = this.toText(value);

    if (!text) {
      return 'Sin fecha';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
      return text;
    }

    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/La_Paz',
    }).format(parsed);
  }

  trackCliente(index: number, cliente: ObraDeudorClienteItem): string {
    return `${cliente.nombre_cliente}|${cliente.num_cel}|${index}`;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
