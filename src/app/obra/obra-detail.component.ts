import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ObraDetalle,
  ObraDetallePersonal,
  ObraDeudaDetalle,
  ObraDeudaPago,
  ObraHerramientaDisponible,
  ObraHerramientaDetalle,
  ObraHerramientaDevolucionPayload,
  ObraHerramientaSyncPayload,
  ObraPersonalPagoDetalleResumen,
  ObraMaterialDetalle,
  ObraMaterialDisponible,
  ObraPersonalPagoPayload,
  ObraPersonalPayload,
  ObraPersonalPagoMovimientoDetalle,
  ObraPersonalSyncPayload,
  ObraMaterialRecicladoCompletosPayload,
  ObraMaterialRecicladoItemPayload,
  ObraMaterialRecicladosPayload,
} from './obra.interfaces';
import { ObraPersonalModalComponent } from './components/obra-personal-modal.component';
import { ObraService } from './obra.service';
import { SucursalService } from '../shared/sucursal/sucursal.service';

interface ObraDetailViewModel {
  idObra: number;
  projectIdLabel: string;
  statusLabel: string;
  deadlineLabel: string;
  progreso: number;
  nombreObra: string;
  ubicacion: string;
  nombreCliente: string;
  fechaInicio: string;
  fechaFin: string;
  precioTotal: number;
  saldo: number;
  pagado: number;
  pendiente: number;
  pagadoPorcentaje: number;
  pendientePorcentaje: number;
  personales: ObraDetallePersonal[];
}

interface PersonalMovimientoFormState {
  tipo: 'adelanto' | 'descuento';
  monto: string;
  descripcion: string;
  fecha: string;
}

interface DebtPaymentFormState {
  fecha_pactada: string;
  monto_pactado: string;
}

interface MaterialCatalogSelection {
  [idMaterial: number]: number;
}

interface ToolCatalogSelection {
  [idHerramienta: number]: number;
}

type FinalizeWorkStep = 'materiales' | 'herramientas';

type MaterialFinalizeMode = 'completo' | 'reciclado' | null;

interface MaterialFinalizeRecicladoForm {
  medida: string;
  cantidad: string;
}

interface MaterialFinalizeSelection {
  mode: MaterialFinalizeMode;
  completos: string;
  reciclados: MaterialFinalizeRecicladoForm[];
}

interface ToolFinalizeSelection {
  devuelta: string;
  danada: string;
  perdida: string;
}

type ObraDetailTab = 'general' | 'personal' | 'pagos' | 'material' | 'herramientas';

@Component({
  selector: 'app-obra-detail',
  standalone: true,
  imports: [ObraPersonalModalComponent],
  template: `
    <section class="space-y-6">
      <div [hidden]="!loading()">
        <div
          class="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm"
        >
          Cargando detalle de la obra...
        </div>
      </div>

      <div [hidden]="!error()">
        <div
          class="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700"
        >
          {{ error() }}
        </div>
      </div>

      <div class="space-y-4" [hidden]="!detail()">
        <div
          class="rounded-[34px] border border-slate-100 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
        >
          <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="inline-flex items-center gap-2 rounded-sm bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-900"
                >
                  <span class="h-2 w-2 rounded-full bg-slate-900"></span>
                  Vista de:
                </span>
                <span class="text-sm font-medium tracking-[0.02em] text-slate-400">{{
                  detailSafe().projectIdLabel
                }}</span>
              </div>

              <div>
                <h1 class="max-w-2xl text-4xl font-black leading-[0.95] text-slate-950 sm:text-5xl">
                  Obra: {{ detailSafe().nombreObra }}
                </h1>
                <p class="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <svg
                    class="h-4 w-4 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                    />
                  </svg>
                  {{ detailSafe().ubicacion }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 xl:min-w-[400px] xl:grid-cols-2">
              <div class="rounded-[28px] border border-slate-100 bg-slate-50 px-5 py-4 shadow-sm">
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-14 w-14 items-center justify-center rounded-full border-[6px] border-blue-700 text-sm font-black text-slate-900"
                  >
                    {{ detailSafe().progreso }}%
                  </div>
                  <div>
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Estado
                    </p>
                    <p class="text-lg font-black text-blue-700">{{ detailSafe().statusLabel }}</p>
                  </div>
                </div>
              </div>

              <div class="rounded-[28px] border border-slate-100 bg-slate-50 px-5 py-4 shadow-sm">
                <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Por acabar en
                </p>
                <p class="mt-1 text-lg font-black text-rose-600">
                  {{ detailSafe().deadlineLabel }}
                </p>
              </div>

              <div class="xl:col-span-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  class="inline-flex min-w-[170px] items-center justify-center rounded-2xl border border-rose-500 bg-white px-6 py-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  (click)="openFinalizeModal()"
                >
                  Finalizar Obra
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          @for (tab of tabs; track trackTab($index, tab)) {
            <button
              type="button"
              class="rounded-full px-4 py-2 text-sm font-semibold transition"
              [class.bg-blue-700]="activeTab() === tab.id"
              [class.text-white]="activeTab() === tab.id"
              [class.shadow-sm]="activeTab() === tab.id"
              [class.text-slate-500]="activeTab() !== tab.id"
              [class.hover:text-blue-700]="activeTab() !== tab.id"
              (click)="setActiveTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        <div
          class="rounded-[30px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
        >
          <div class="space-y-5" [hidden]="activeTab() !== 'personal'">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-2xl font-black text-slate-950">Gestion de Pagos</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Selecciona un trabajador para abrir su detalle en modal y registrar adelantos o
                  descuentos.
                </p>
              </div>
              <div class="rounded-2xl bg-blue-50 px-3 py-2 text-right">
                <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Acordado
                </p>
                <p class="text-lg font-black text-blue-700">
                  {{ formatMoney(personalPayments()?.total_acordado ?? 0) }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Adelantos
                </p>
                <p class="mt-2 text-xl font-black text-blue-700">
                  {{ formatMoney(personalPayments()?.total_adelanto ?? 0) }}
                </p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Descuentos
                </p>
                <p class="mt-2 text-xl font-black text-rose-600">
                  {{ formatMoney(personalPayments()?.total_descuento ?? 0) }}
                </p>
              </div>
              <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4 xl:col-span-2">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Saldo neto pendiente
                </p>
                <p class="mt-2 text-2xl font-black text-blue-700">
                  {{ formatMoney(personalPayments()?.saldo_pendiente ?? 0) }}
                </p>
              </div>
            </div>

            <div class="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Trabajadores
              </p>
              <div class="mt-3 space-y-2">
                @for (personal of detailSafe().personales; track personal.id_usuario) {
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition"
                    [class.bg-white]="selectedPersonalPaymentUserId() === personal.id_usuario"
                    [class.shadow-sm]="selectedPersonalPaymentUserId() === personal.id_usuario"
                    [class.border]="selectedPersonalPaymentUserId() === personal.id_usuario"
                    [class.border-blue-200]="
                      selectedPersonalPaymentUserId() === personal.id_usuario
                    "
                    [class.bg-slate-100]="selectedPersonalPaymentUserId() !== personal.id_usuario"
                    (click)="openPersonalPaymentModal(personal.id_usuario)"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-bold text-slate-950">{{ personal.nombre_usuario }}</p>
                      <p class="text-sm text-slate-500">{{ personal.nombre_rol }}</p>
                    </div>
                    <div
                      class="text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-400"
                    >
                      <span class="block text-slate-900">{{
                        formatMoney(getPersonalDebt(personal.id_usuario))
                      }}</span>
                      <span>Bs por cobrar</span>
                    </div>
                  </button>
                }
              </div>
            </div>

            @if (personalPaymentsLoading()) {
              <div
                class="rounded-3xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500"
              >
                Cargando detalle del trabajador...
              </div>
            } @else if (personalPaymentsError()) {
              <div
                class="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700"
              >
                {{ personalPaymentsError() }}
              </div>
            }
          </div>

          <div class="space-y-6" [hidden]="activeTab() !== 'general'">
            <div class="grid gap-4 lg:grid-cols-3">
              <section class="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  General project data
                </p>
                <h2 class="mt-2 text-xl font-black text-slate-950">
                  {{ detailSafe().nombreObra }}
                </h2>

                <dl class="mt-4 space-y-2 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Client name</dt>
                    <dd class="text-right font-bold text-slate-900">
                      {{ detailSafe().nombreCliente }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Project manager</dt>
                    <dd class="text-right font-bold text-slate-900">{{ projectManagerLabel }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Project ID</dt>
                    <dd class="text-right font-bold text-slate-900">
                      {{ detailSafe().projectIdLabel }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Ubicacion</dt>
                    <dd class="text-right font-bold text-slate-900">
                      {{ detailSafe().ubicacion }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Start date</dt>
                    <dd class="text-right font-bold text-slate-900">
                      {{ detailSafe().fechaInicio }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="font-semibold text-slate-500">Estimated end</dt>
                    <dd class="text-right font-bold text-slate-900">{{ detailSafe().fechaFin }}</dd>
                  </div>
                </dl>
              </section>

              <section class="rounded-2xl border border-slate-100 bg-white p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Estado de la obra
                </p>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <span
                    class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700"
                  >
                    {{ detailSafe().statusLabel }}
                  </span>
                  <span class="text-sm font-semibold text-slate-500">{{
                    detailSafe().deadlineLabel
                  }}</span>
                </div>

                <div class="mt-4">
                  <div
                    class="flex items-center justify-between text-sm font-semibold text-slate-500"
                  >
                    <span>Progreso</span>
                    <span class="text-blue-700">{{ detailSafe().progreso }}%</span>
                  </div>
                  <div class="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full bg-blue-600"
                      [style.width.%]="detailSafe().progreso"
                    ></div>
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Budget
                </p>
                <div class="mt-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-500">Total budget</span>
                    <span class="text-sm font-black text-slate-900">{{
                      formatMoney(detailSafe().precioTotal)
                    }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-500">Executed budget</span>
                    <span class="text-sm font-black text-blue-700">{{
                      formatMoney(detailSafe().pagado)
                    }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-500">Pending</span>
                    <span class="text-sm font-black text-rose-600">{{
                      formatMoney(detailSafe().pendiente)
                    }}</span>
                  </div>
                </div>
                <div class="mt-4">
                  <div
                    class="flex items-center justify-between text-xs font-semibold text-slate-400"
                  >
                    <span>Pagado {{ detailSafe().pagadoPorcentaje }}%</span>
                    <span>Pendiente {{ detailSafe().pendientePorcentaje }}%</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full bg-blue-600"
                      [style.width.%]="detailSafe().pagadoPorcentaje"
                    ></div>
                  </div>
                </div>
              </section>
            </div>

            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-2xl font-black text-slate-950">Personal Asignado</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Marca con el basurero o tocando el card a quien quieres quitar. Al guardar se
                  enviara la lista final y los pagos de los eliminados se borraran.
                </p>
              </div>
              <div
                class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"
              >
                <svg
                  class="h-5 w-5"
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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19.5 8.25v4.5m2.25-2.25h-4.5"
                  />
                </svg>
              </div>
            </div>

            <div class="mt-6 space-y-3">
              @for (personal of detailSafe().personales; track personal.id_usuario) {
                <article
                  class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-4 transition"
                  [class.bg-rose-50]="isMarkedForRemoval(personal.id_usuario)"
                  [class.border]="isMarkedForRemoval(personal.id_usuario)"
                  [class.border-rose-200]="isMarkedForRemoval(personal.id_usuario)"
                  [class.bg-slate-50]="!isMarkedForRemoval(personal.id_usuario)"
                  [class.hover:bg-slate-100]="!isMarkedForRemoval(personal.id_usuario)"
                  [class.hover:bg-rose-100]="isMarkedForRemoval(personal.id_usuario)"
                  (click)="toggleRemoval(personal)"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-2xl"
                      [class.bg-blue-50]="!isMarkedForRemoval(personal.id_usuario)"
                      [class.text-blue-700]="!isMarkedForRemoval(personal.id_usuario)"
                      [class.bg-rose-100]="isMarkedForRemoval(personal.id_usuario)"
                      [class.text-rose-700]="isMarkedForRemoval(personal.id_usuario)"
                    >
                      <svg
                        class="h-5 w-5"
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
                    </div>
                    <div class="min-w-0">
                      <p
                        class="truncate font-bold"
                        [class.text-slate-950]="!isMarkedForRemoval(personal.id_usuario)"
                        [class.text-rose-950]="isMarkedForRemoval(personal.id_usuario)"
                      >
                        {{ personal.nombre_usuario }}
                      </p>
                      <p
                        class="text-sm"
                        [class.text-slate-500]="!isMarkedForRemoval(personal.id_usuario)"
                        [class.text-rose-700]="isMarkedForRemoval(personal.id_usuario)"
                      >
                        {{ personal.nombre_rol }}
                      </p>
                      <p
                        class="mt-1 text-xs font-semibold uppercase tracking-[0.18em]"
                        [class.text-blue-700]="!isMarkedForRemoval(personal.id_usuario)"
                        [class.text-rose-700]="isMarkedForRemoval(personal.id_usuario)"
                      >
                        Acuerdo: {{ formatMoney(personal.pago_acordado) }}
                      </p>
                      @if (isMarkedForRemoval(personal.id_usuario)) {
                        <p class="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-rose-600">
                          Se eliminara al guardar
                        </p>
                      }
                    </div>
                  </div>
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-full border transition"
                    [class.border-slate-200]="!isMarkedForRemoval(personal.id_usuario)"
                    [class.text-slate-500]="!isMarkedForRemoval(personal.id_usuario)"
                    [class.hover:border-rose-300]="!isMarkedForRemoval(personal.id_usuario)"
                    [class.hover:text-rose-700]="!isMarkedForRemoval(personal.id_usuario)"
                    [class.border-rose-300]="isMarkedForRemoval(personal.id_usuario)"
                    [class.text-rose-700]="isMarkedForRemoval(personal.id_usuario)"
                    [class.bg-rose-100]="isMarkedForRemoval(personal.id_usuario)"
                    (click)="$event.stopPropagation(); toggleRemoval(personal)"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="m8 6 1-2h6l1 2" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l1 14h10l1-14" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 11v4M14 11v4" />
                    </svg>
                  </button>
                </article>
              }

              @if (detailSafe().personales.length === 0) {
                <div
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                >
                  Todavia no hay personal asignado.
                </div>
              }
            </div>

            <button
              type="button"
              class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-4 font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
              (click)="openPersonalModal()"
            >
              <span class="text-xl leading-none">+</span>
              Asignar Personal
            </button>

            <div
              class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p class="text-sm text-slate-600">
                @if (pendingRemovedCount() > 0) {
                  Se quitaran {{ pendingRemovedCount() }} trabajador(es) al guardar.
                } @else {
                  No hay bajas pendientes.
                }
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                [disabled]="isSavingPersonal() || pendingRemovedCount() === 0"
                (click)="savePersonnelChanges()"
              >
                {{ isSavingPersonal() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </div>

          <div class="space-y-6" [hidden]="activeTab() !== 'pagos'">
            <div
              class="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500"
              [hidden]="!debtPaymentsLoading()"
            >
              Cargando submodulo de pagos...
            </div>

            <div
              class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700"
              [hidden]="!debtPaymentsError()"
            >
              {{ debtPaymentsError() }}
            </div>

            <div class="space-y-6" [hidden]="debtPaymentsLoading() || debtPaymentsError()">
              <div class="grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr_260px]">
                <section
                  class="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
                >
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Total acordado
                  </p>
                  <div class="mt-2 flex items-end gap-2">
                    <span class="text-4xl font-black text-slate-950">{{
                      formatMoney(debtOverview().totalAcordado)
                    }}</span>
                    <span class="pb-1 text-lg font-bold text-slate-500">Bs</span>
                  </div>
                  <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-slate-900" [style.width.%]="100"></div>
                  </div>
                </section>

                <section
                  class="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
                >
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Total pagado
                  </p>
                  <div class="mt-2 flex items-end gap-2">
                    <span class="text-4xl font-black text-blue-700">{{
                      formatMoney(debtOverview().totalPagado)
                    }}</span>
                    <span class="pb-1 text-lg font-bold text-slate-500">Bs</span>
                  </div>
                  <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full bg-blue-700"
                      [style.width.%]="debtOverview().pagadoPorcentaje"
                    ></div>
                  </div>
                </section>

                <section
                  class="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
                >
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Saldo pendiente
                  </p>
                  <div class="mt-2 flex items-end gap-2">
                    <span class="text-4xl font-black text-amber-700">{{
                      formatMoney(debtOverview().saldoPendiente)
                    }}</span>
                    <span class="pb-1 text-lg font-bold text-slate-500">Bs</span>
                  </div>
                  <p class="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Saldo restante actual
                  </p>
                  <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full bg-amber-500"
                      [style.width.%]="debtOverview().pendientePorcentaje"
                    ></div>
                  </div>
                </section>

                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.35)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  (click)="openDebtPaymentModalForCreate()"
                  [disabled]="isSavingDebtPayment()"
                >
                  <span
                    class="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xl leading-none"
                    >+</span
                  >
                  Registrar Nuevo Pago
                </button>
              </div>

              <section
                class="rounded-[30px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 class="text-2xl font-black text-slate-950">Cronograma de Pagos y Cuotas</h2>
                    <p class="mt-1 text-sm text-slate-500">
                      Lista de pagos pactados o registrados para esta obra.
                    </p>
                  </div>

                  <div class="flex items-center gap-5 text-sm font-semibold text-slate-500">
                    <button type="button" class="transition hover:text-blue-700">
                      Exportar PDF
                    </button>
                    <button type="button" class="transition hover:text-blue-700">
                      Ver Historial
                    </button>
                  </div>
                </div>

                <div
                  class="mt-8 overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50"
                >
                  <div
                    class="grid grid-cols-[96px_1.1fr_1fr_140px_160px] gap-4 border-b border-slate-100 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                  >
                    <div># Cuota</div>
                    <div>Fecha vencimiento</div>
                    <div>Monto (Bs)</div>
                    <div>Estado</div>
                    <div class="text-right">Acciones</div>
                  </div>

                  <div class="space-y-3 p-3">
                    @for (
                      pago of debtOverview().pagos;
                      track pago.id_obra_pago;
                      let index = $index
                    ) {
                      <article
                        class="grid grid-cols-[96px_1.1fr_1fr_140px_160px] items-center gap-4 rounded-[22px] bg-white px-6 py-5 shadow-sm transition"
                        [class.ring-2]="selectedDebtPaymentId() === pago.id_obra_pago"
                        [class.ring-blue-200]="selectedDebtPaymentId() === pago.id_obra_pago"
                      >
                        <div class="text-lg font-black text-slate-950">
                          {{ formatQuotaLabel(index) }}
                        </div>

                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <svg
                            class="h-4 w-4 text-slate-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M8 2.25v3M16 2.25v3M3.75 9h16.5"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25Z"
                            />
                          </svg>
                          {{ formatDate(pago.fecha_pactada ?? '') }}
                        </div>

                        <div class="text-lg font-black text-slate-950">
                          {{ formatMoney(pago.monto_pactado) }}
                        </div>

                        <div>
                          @if (isDebtPagoPaid(pago)) {
                            <span
                              class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-600"
                            >
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              Pagado
                            </span>
                          } @else {
                            <span
                              class="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-rose-600"
                            >
                              <span class="h-2 w-2 rounded-full bg-rose-500"></span>
                              Pendiente
                            </span>
                          }
                        </div>

                        <div class="flex items-center justify-end gap-2 text-blue-700">
                          <button
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Registrar pago"
                            (click)="$event.stopPropagation(); markDebtPaymentAsPaid(pago)"
                            [disabled]="isSavingDebtPayment()"
                            [hidden]="isDebtPagoPaid(pago)"
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
                                d="M20 6 9 17l-5-5"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Marcar como pendiente"
                            (click)="$event.stopPropagation(); markDebtPaymentAsUnpaid(pago)"
                            [disabled]="isSavingDebtPayment()"
                            [hidden]="!isDebtPagoPaid(pago)"
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
                                d="M6 6 18 18M18 6 6 18"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:text-blue-800"
                            title="Editar pago"
                            (click)="$event.stopPropagation(); openDebtPaymentModalForEdit(pago)"
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
                                d="M16.862 4.487a2.25 2.25 0 0 1 3.182 3.182L8.25 19.463 3 21l1.537-5.25L16.862 4.487Z"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                            title="Eliminar pago"
                            (click)="$event.stopPropagation(); confirmAndDeleteDebtPayment(pago)"
                          >
                            <svg
                              class="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.8"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="m8 6 1-2h6l1 2"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 6l1 14h10l1-14"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M10 11v4M14 11v4"
                              />
                            </svg>
                          </button>
                        </div>
                      </article>
                    }

                    @if (debtOverview().pagos.length === 0) {
                      <div
                        class="rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500"
                      >
                        No huvo pagos hasat la fecha.
                      </div>
                    }
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div class="space-y-6" [hidden]="activeTab() !== 'material'">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div class="flex-1 space-y-4">
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
                      <circle cx="11" cy="11" r="7"></circle>
                    </svg>
                  </span>
                  <input
                    type="text"
                    class="w-full rounded-3xl border border-slate-200 bg-white px-12 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400"
                    placeholder="Buscador ancho de materiales e insumos..."
                    [value]="materialSearchTerm()"
                    (input)="setMaterialSearchTerm($any($event.target).value)"
                  />
                </div>

                <section
                  class="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h3 class="text-xl font-black text-slate-950">Insumos y Materiales</h3>
                      <p class="mt-1 text-sm text-slate-500">
                        Listado de materiales asignados a la obra.
                      </p>
                    </div>
                  </div>

                  <div
                    class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                    [hidden]="!materialLoading()"
                  >
                    Cargando materiales...
                  </div>

                  <div
                    class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700"
                    [hidden]="!materialError()"
                  >
                    {{ materialError() }}
                  </div>

                  <div
                    class="mt-6 overflow-hidden rounded-2xl border border-slate-100"
                    [hidden]="materialLoading() || materialError()"
                  >
                    <div
                      class="grid grid-cols-[2.2fr_110px_140px_140px_88px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                    >
                      <div>Item / descripcion</div>
                      <div>Cantidad</div>
                      <div>Costo unit.</div>
                      <div>Subtotal</div>
                      <div>Accion</div>
                    </div>

                    <div class="divide-y divide-slate-100">
                      @for (material of filteredMateriales(); track material.id_material) {
                        <div
                          class="grid grid-cols-[2.2fr_110px_140px_140px_88px] items-center gap-4 px-5 py-4"
                        >
                          <div class="min-w-0">
                            <p class="truncate font-semibold text-slate-900">
                              {{ material.nombre }}
                            </p>
                            <p class="mt-1 text-xs text-slate-500">
                              {{ material.nombre_categoria }}
                              @if (material.medida) {
                                · {{ material.medida }}
                              }
                              @if (material.codigo) {
                                · {{ material.codigo }}
                              }
                            </p>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                              [value]="material.cantidad_usada"
                              (input)="
                                setMaterialQuantity(material.id_material, $any($event.target).value)
                              "
                            />
                          </div>
                          <div class="text-sm font-semibold text-slate-700">
                            {{ formatMoney(material.precio) }}
                          </div>
                          <div class="text-sm font-black text-blue-700">
                            {{
                              formatMoney(
                                getMaterialSubtotal(material.cantidad_usada, material.precio)
                              )
                            }}
                          </div>
                          <div class="flex justify-end">
                            <button
                              type="button"
                              class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                              title="Quitar material"
                              (click)="removeMaterialFromDetail(material.id_material)"
                            >
                              <svg
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                              >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="m8 6 1-2h6l1 2"
                                />
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M6 6l1 14h10l1-14"
                                />
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M10 11v4M14 11v4"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      }

                      @if (filteredMateriales().length === 0) {
                        <div class="px-5 py-8 text-center text-sm text-slate-500">
                          No hay materiales para mostrar.
                        </div>
                      }
                    </div>
                  </div>

                  <button
                    type="button"
                    class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                    (click)="openMaterialCatalog()"
                  >
                    + Agregar Material
                  </button>
                </section>
              </div>

              <aside
                class="w-full xl:w-[340px] rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
              >
                <h3 class="text-xl font-black text-slate-950">Resumen Económico</h3>
                <div class="mt-5 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between">
                    <span>Subtotal Materiales</span>
                    <span class="font-semibold text-slate-900">{{
                      formatMoney(materialTotals().subtotalMateriales)
                    }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Mano de Obra (Est.)</span>
                    <span class="font-semibold text-slate-900">{{
                      formatMoney(materialTotals().manoObra)
                    }}</span>
                  </div>
                  <div class="border-t border-dashed border-slate-200 pt-3"></div>
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-700">Total Sugerido</span>
                    <span class="text-lg font-black text-blue-700">{{
                      formatMoney(materialTotals().totalSugerido)
                    }}</span>
                  </div>
                </div>

                <div class="mt-6">
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Total acordado con cliente (Bs)
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black text-slate-900 outline-none focus:border-blue-400"
                    [value]="materialTotalAcordado()"
                    (input)="setMaterialTotalAcordado($any($event.target).value)"
                  />
                </div>

                <div
                  class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  [hidden]="!materialSaveError()"
                >
                  {{ materialSaveError() }}
                </div>

                <div
                  class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                  [hidden]="!materialSaveSuccess()"
                >
                  {{ materialSaveSuccess() }}
                </div>

                <button
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  [disabled]="isSavingMaterial() || !materialHasChanges()"
                  (click)="saveMaterialChanges()"
                >
                  {{ isSavingMaterial() ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </aside>
            </div>
          </div>

          <div class="space-y-6" [hidden]="activeTab() !== 'herramientas'">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div class="flex-1 space-y-4">
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
                      <circle cx="11" cy="11" r="7"></circle>
                    </svg>
                  </span>
                  <input
                    type="text"
                    class="w-full rounded-3xl border border-slate-200 bg-white px-12 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400"
                    placeholder="Solicitar nueva herramienta para esta obra..."
                    [value]="toolSearchTerm()"
                    (input)="setToolSearchTerm($any($event.target).value)"
                  />
                </div>

                <section
                  class="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h3 class="text-xl font-black text-slate-950">Herramientas de la obra</h3>
                      <p class="mt-1 text-sm text-slate-500">
                        Lista actual consumida desde el detalle de la obra.
                      </p>
                    </div>

                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                      (click)="openToolCatalog()"
                    >
                      Solicitar Herramienta
                    </button>
                  </div>

                  <div
                    class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                    [hidden]="!toolLoading()"
                  >
                    Cargando herramientas...
                  </div>

                  <div
                    class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700"
                    [hidden]="!toolError()"
                  >
                    {{ toolError() }}
                  </div>

                  <div
                    class="mt-6 overflow-hidden rounded-2xl border border-slate-100"
                    [hidden]="toolLoading() || toolError()"
                  >
                    <div
                      class="grid grid-cols-[3fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                    >
                      <div>Herramienta</div>
                      <div>Estado</div>
                      <div>En obra</div>
                    </div>

                    <div class="divide-y divide-slate-100">
                      @for (
                        herramienta of filteredHerramientas();
                        track herramienta.id_herramienta
                      ) {
                        <div class="grid grid-cols-[3fr_1fr_1fr] items-center gap-4 px-5 py-4">
                          <div class="min-w-0">
                            <p class="truncate font-semibold text-slate-900">
                              {{ herramienta.nombre_herramienta }}
                            </p>
                            <div
                              class="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"
                            >
                              <span
                                class="rounded-full bg-slate-100 px-2.5 py-1 uppercase tracking-[0.18em] text-slate-400"
                                >Cantidad asignada</span
                              >
                              @if (editingToolId() === herramienta.id_herramienta) {
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  class="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                                  [value]="herramienta.cantidad_asignada"
                                  (input)="
                                    setToolQuantity(
                                      herramienta.id_herramienta,
                                      $any($event.target).value
                                    )
                                  "
                                />
                              } @else {
                                <span
                                  class="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700"
                                  >{{ herramienta.cantidad_asignada }}</span
                                >
                              }

                              <button
                                type="button"
                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                                title="Editar cantidad"
                                (click)="toggleEditingTool(herramienta.id_herramienta)"
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
                                    d="M16.862 4.487a2.25 2.25 0 0 1 3.182 3.182L8.25 19.463 3 21l1.537-5.25L16.862 4.487Z"
                                  />
                                </svg>
                              </button>

                              <button
                                type="button"
                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                                title="Eliminar herramienta"
                                (click)="removeToolFromDetail(herramienta.id_herramienta)"
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
                                    d="M3 6h18"
                                  />
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m8 6 1-2h6l1 2"
                                  />
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6 6l1 14h10l1-14"
                                  />
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M10 11v4M14 11v4"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div>
                            <span
                              class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700"
                            >
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              {{ herramienta.en_obra > 0 ? 'En uso' : 'Disponible' }}
                            </span>
                          </div>
                          <div class="text-sm font-black text-blue-700">
                            {{ herramienta.en_obra }}
                          </div>
                        </div>
                      }

                      @if (filteredHerramientas().length === 0) {
                        <div class="px-5 py-8 text-center text-sm text-slate-500">
                          No hay herramientas para mostrar.
                        </div>
                      }
                    </div>
                  </div>
                </section>
              </div>

              <aside
                class="w-full xl:w-[340px] rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
              >
                <h3 class="text-xl font-black text-slate-950">Datos Generales</h3>
                <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Herramientas asignadas
                    </p>
                    <p class="mt-2 text-2xl font-black text-slate-950">
                      {{ herramientaTotals().asignadas }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      En obra
                    </p>
                    <p class="mt-2 text-2xl font-black text-blue-700">
                      {{ herramientaTotals().enObra }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Devueltas
                    </p>
                    <p class="mt-2 text-2xl font-black text-emerald-700">
                      {{ herramientaTotals().devueltas }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Dañadas
                    </p>
                    <p class="mt-2 text-2xl font-black text-rose-600">
                      {{ herramientaTotals().danadas }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-slate-50 p-4 sm:col-span-2 xl:col-span-1">
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Perdidas
                    </p>
                    <p class="mt-2 text-2xl font-black text-amber-600">
                      {{ herramientaTotals().perdidas }}
                    </p>
                  </div>
                </div>

                <div
                  class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  [hidden]="!toolSaveError()"
                >
                  {{ toolSaveError() }}
                </div>

                <div
                  class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                  [hidden]="!toolSaveSuccess()"
                >
                  {{ toolSaveSuccess() }}
                </div>

                <button
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  [disabled]="isSavingTool() || !toolHasChanges()"
                  (click)="saveToolChanges()"
                >
                  {{ isSavingTool() ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </aside>
            </div>
          </div>

          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            [hidden]="!isToolCatalogOpen()"
          >
            <section
              class="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
              >
                <div>
                  <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                    Obra / Herramientas
                  </p>
                  <h2 class="mt-2 text-2xl font-black text-slate-950">Solicitar herramienta</h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Selecciona herramientas disponibles de la sucursal para agregarlas a la obra.
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  (click)="closeToolCatalog()"
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
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
                      <circle cx="11" cy="11" r="7"></circle>
                    </svg>
                  </span>
                  <input
                    type="text"
                    class="w-full rounded-3xl border border-slate-200 bg-white px-12 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400"
                    placeholder="Buscar herramienta disponible..."
                    [value]="toolCatalogSearchTerm()"
                    (input)="setToolCatalogSearchTerm($any($event.target).value)"
                  />
                </div>

                <div
                  class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                  [hidden]="!toolCatalogLoading()"
                >
                  Cargando herramientas disponibles...
                </div>

                <div
                  class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700"
                  [hidden]="!toolCatalogError()"
                >
                  {{ toolCatalogError() }}
                </div>

                <div
                  class="mt-6 overflow-hidden rounded-2xl border border-slate-100"
                  [hidden]="toolCatalogLoading() || toolCatalogError()"
                >
                  <div
                    class="grid grid-cols-[2.4fr_1.2fr_110px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                  >
                    <div>Herramienta</div>
                    <div>Categoría</div>
                    <div>Disponible</div>
                    <div>Agregar</div>
                  </div>

                  <div class="divide-y divide-slate-100">
                    @for (item of filteredToolCatalogItems(); track item.id_herramienta) {
                      <div
                        class="grid grid-cols-[2.4fr_1.2fr_110px_110px] items-center gap-4 px-5 py-4"
                      >
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-slate-900">{{ item.nombre }}</p>
                        </div>
                        <div class="text-sm font-semibold text-slate-700">
                          {{ item.nombre_categoria_herramienta }}
                        </div>
                        <div class="text-sm font-black text-blue-700">
                          {{ item.cantidad_disponible }}
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                            [value]="toolCatalogSelection()[item.id_herramienta] || ''"
                            (input)="
                              setToolCatalogQuantity(
                                item.id_herramienta,
                                $any($event.target).value,
                                item.cantidad_disponible
                              )
                            "
                          />
                        </div>
                      </div>
                    }

                    @if (filteredToolCatalogItems().length === 0) {
                      <div class="px-5 py-8 text-center text-sm text-slate-500">
                        No hay herramientas disponibles.
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    (click)="closeToolCatalog()"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    [disabled]="selectedToolCount() === 0"
                    (click)="applyToolSelection()"
                  >
                    Agregar seleccionadas ({{ selectedToolCount() }})
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            [hidden]="!isDebtPaymentModalOpen()"
          >
            <section
              class="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
              >
                <div>
                  <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                    Obra / Pagos
                  </p>
                  <h2 class="mt-2 text-2xl font-black text-slate-950">
                    {{
                      selectedDebtPaymentId() > 0 ? 'Editar pago pactado' : 'Registrar pago pactado'
                    }}
                  </h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Define fecha de vencimiento y monto pactado.
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  (click)="closeDebtPaymentModal()"
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

              <div class="px-6 py-6">
                <div
                  class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  [hidden]="!debtPaymentFormError()"
                >
                  {{ debtPaymentFormError() }}
                </div>

                <div class="grid gap-4">
                  <div>
                    <p
                      class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                    >
                      Fecha vencimiento
                    </p>
                    <input
                      type="date"
                      class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                      [value]="debtPaymentForm().fecha_pactada"
                      (input)="setDebtPaymentDate($any($event.target).value)"
                    />
                  </div>

                  <div>
                    <p
                      class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                    >
                      Monto pactado (Bs)
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                      [value]="debtPaymentForm().monto_pactado"
                      (input)="setDebtPaymentAmount($any($event.target).value)"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    [disabled]="isSavingDebtPayment() || !canSaveDebtPayment()"
                    (click)="saveDebtPayment()"
                  >
                    {{ selectedDebtPaymentId() > 0 ? 'Actualizar pago' : 'Registrar pago' }}
                  </button>

                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    (click)="closeDebtPaymentModal()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            [hidden]="!isMaterialCatalogOpen()"
          >
            <section
              class="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
              >
                <div>
                  <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                    Obra / Materiales
                  </p>
                  <h2 class="mt-2 text-2xl font-black text-slate-950">Inventario disponible</h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Selecciona materiales y la cantidad que deseas agregar.
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  (click)="closeMaterialCatalog()"
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
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
                      <circle cx="11" cy="11" r="7"></circle>
                    </svg>
                  </span>
                  <input
                    type="text"
                    class="w-full rounded-3xl border border-slate-200 bg-white px-12 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400"
                    placeholder="Buscar por nombre, codigo o medida..."
                    [value]="materialCatalogSearchTerm()"
                    (input)="setMaterialCatalogSearchTerm($any($event.target).value)"
                  />
                </div>

                <div
                  class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                  [hidden]="!materialCatalogLoading()"
                >
                  Cargando inventario...
                </div>

                <div
                  class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700"
                  [hidden]="!materialCatalogError()"
                >
                  {{ materialCatalogError() }}
                </div>

                <div
                  class="mt-5 overflow-hidden rounded-2xl border border-slate-100"
                  [hidden]="materialCatalogLoading() || materialCatalogError()"
                >
                  <div
                    class="grid grid-cols-[2.2fr_110px_130px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                  >
                    <div>Material</div>
                    <div>Disponible</div>
                    <div>Precio</div>
                    <div>Agregar</div>
                  </div>

                  <div class="divide-y divide-slate-100">
                    @for (item of filteredMaterialCatalogItems(); track item.id_material) {
                      <div
                        class="grid grid-cols-[2.2fr_110px_130px_120px] items-center gap-4 px-5 py-4"
                      >
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-slate-900">{{ item.nombre }}</p>
                          <p class="mt-1 text-xs text-slate-500">
                            {{ item.nombre_categoria }}
                            @if (item.medida) {
                              · {{ item.medida }}
                            }
                            @if (item.codigo) {
                              · {{ item.codigo }}
                            }
                          </p>
                        </div>
                        <div class="text-sm font-semibold text-slate-700">{{ item.cantidad }}</div>
                        <div class="text-sm font-semibold text-slate-700">
                          {{ formatMoney(item.precio) }}
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            [max]="item.cantidad"
                            step="0.01"
                            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                            [value]="materialCatalogSelection()[item.id_material] || ''"
                            (input)="
                              setMaterialCatalogQuantity(
                                item.id_material,
                                $any($event.target).value,
                                item.cantidad
                              )
                            "
                          />
                        </div>
                      </div>
                    }

                    @if (filteredMaterialCatalogItems().length === 0) {
                      <div class="px-5 py-8 text-center text-sm text-slate-500">
                        No hay materiales disponibles.
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    (click)="closeMaterialCatalog()"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    [disabled]="selectedMaterialCount() === 0"
                    (click)="applyMaterialSelection()"
                  >
                    Agregar seleccionados ({{ selectedMaterialCount() }})
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            [hidden]="!isPersonalPaymentModalOpen()"
          >
            <section
              class="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
              >
                <div>
                  <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                    Obra / Personal
                  </p>
                  <h2 class="mt-2 text-2xl font-black text-slate-950">
                    {{ selectedPersonalPayment()?.nombre_usuario ?? 'Trabajador' }}
                  </h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Detalle de pagos y registro de movimientos.
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  (click)="closePersonalPaymentModal()"
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
                @if (personalPaymentsLoading()) {
                  <div
                    class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Cargando detalle del trabajador...
                  </div>
                } @else if (personalPaymentsError()) {
                  <div
                    class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700"
                  >
                    {{ personalPaymentsError() }}
                  </div>
                } @else if (!selectedPersonalPayment()) {
                  <div
                    class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No hay datos para mostrar.
                  </div>
                } @else {
                  <div class="grid gap-3 sm:grid-cols-3">
                    <div class="rounded-2xl bg-slate-50 p-4">
                      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Acordado
                      </p>
                      <p class="mt-2 text-xl font-black text-slate-950">
                        {{ formatMoney(selectedPersonalPayment()?.pago_acordado ?? 0) }}
                      </p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-4">
                      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Adelantos
                      </p>
                      <p class="mt-2 text-xl font-black text-blue-700">
                        {{ formatMoney(selectedPersonalPayment()?.total_adelanto ?? 0) }}
                      </p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-4">
                      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Descuentos
                      </p>
                      <p class="mt-2 text-xl font-black text-rose-600">
                        {{ formatMoney(selectedPersonalPayment()?.total_descuento ?? 0) }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <h4 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">
                          {{
                            selectedPersonalMovementId() > 0
                              ? 'Editar movimiento'
                              : 'Registrar nuevo movimiento'
                          }}
                        </h4>
                        @if (selectedPersonalMovementId() > 0) {
                          <p
                            class="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600"
                          >
                            Clic en otro movimiento para cambiar la edicion
                          </p>
                        }
                      </div>
                      <span
                        class="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"
                      >
                        {{ movementForm().tipo === 'adelanto' ? 'Adelanto' : 'Descuento' }}
                      </span>
                    </div>

                    <div class="mt-4 grid gap-3 sm:grid-cols-[auto_140px_1fr_auto] sm:items-end">
                      <div>
                        <p
                          class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                        >
                          Tipo
                        </p>
                        <div class="flex rounded-2xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            class="rounded-xl px-3 py-2 text-sm font-semibold"
                            [class.bg-blue-700]="movementForm().tipo === 'adelanto'"
                            [class.text-white]="movementForm().tipo === 'adelanto'"
                            [class.text-slate-500]="movementForm().tipo !== 'adelanto'"
                            (click)="setMovementType('adelanto')"
                          >
                            Adelanto
                          </button>
                          <button
                            type="button"
                            class="rounded-xl px-3 py-2 text-sm font-semibold"
                            [class.bg-rose-600]="movementForm().tipo === 'descuento'"
                            [class.text-white]="movementForm().tipo === 'descuento'"
                            [class.text-slate-500]="movementForm().tipo !== 'descuento'"
                            (click)="setMovementType('descuento')"
                          >
                            Descuento
                          </button>
                        </div>
                      </div>

                      <div>
                        <p
                          class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                        >
                          Monto (Bs)
                        </p>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                          [value]="movementForm().monto"
                          (input)="setMovementAmount($any($event.target).value)"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <p
                          class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                        >
                          Motivo / concepto
                        </p>
                        <input
                          type="text"
                          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                          [value]="movementForm().descripcion"
                          (input)="setMovementDescription($any($event.target).value)"
                          placeholder="Ej: anticipo por transporte"
                        />
                      </div>

                      <div>
                        <p
                          class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400"
                        >
                          Fecha
                        </p>
                        <input
                          type="date"
                          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                          [value]="movementForm().fecha"
                          (input)="setMovementDate($any($event.target).value)"
                        />
                      </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        [disabled]="isSavingPersonal() || !canSavePersonalMovement()"
                        (click)="savePersonalMovement()"
                      >
                        {{
                          selectedPersonalMovementId() > 0
                            ? 'Actualizar movimiento'
                            : 'Registrar movimiento'
                        }}
                      </button>

                      @if (selectedPersonalMovementId() > 0) {
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          (click)="cancelPersonalMovementEdit()"
                        >
                          Cancelar edición
                        </button>

                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-2xl border border-rose-500 bg-white px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                          (click)="confirmAndDeletePersonalMovement()"
                        >
                          Eliminar movimiento
                        </button>
                      }
                    </div>
                  </div>

                  <div class="mt-5">
                    <div class="flex items-center justify-between gap-3">
                      <h4 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">
                        Ultimos movimientos
                      </h4>
                      <span
                        class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"
                        >Historial reciente</span
                      >
                    </div>

                    <div class="mt-4 space-y-3">
                      @for (
                        pago of selectedPersonalPayment()?.pagos ?? [];
                        track pago.id_movimiento
                      ) {
                        <article
                          class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                          (click)="startEditingPersonalMovement(pago)"
                        >
                          <div class="min-w-0">
                            <p class="font-bold text-slate-950">
                              {{ pago.tipo === 'adelanto' ? 'Adelanto' : 'Descuento' }}
                              <span class="font-normal text-slate-500"
                                >- {{ pago.descripcion || 'Sin descripcion' }}</span
                              >
                            </p>
                            <p class="text-sm text-slate-500">{{ formatDate(pago.fecha) }}</p>
                          </div>
                          <div class="text-right">
                            <p
                              class="text-sm font-black"
                              [class.text-blue-700]="pago.tipo === 'adelanto'"
                              [class.text-rose-600]="pago.tipo === 'descuento'"
                            >
                              {{ pago.tipo === 'adelanto' ? '+' : '-' }}
                              {{ formatMoney(pago.monto) }}
                            </p>
                            <p
                              class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
                            >
                              Editar
                            </p>
                          </div>
                        </article>
                      }

                      @if ((selectedPersonalPayment()?.pagos?.length ?? 0) === 0) {
                        <div
                          class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Este trabajador todavia no tiene movimientos.
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>

          <div [hidden]="!isPersonalModalOpen()">
            <app-obra-personal-modal
              [obraId]="currentObraId()"
              [assignedUserIds]="personalUserIds()"
              (close)="closePersonalModal()"
              (assignSelected)="handlePersonalSelection($event)"
            />
          </div>

          <div
            class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            [hidden]="!isFinalizeModalOpen()"
          >
            <section
              class="my-auto max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
            >
              <header
                class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"
              >
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.24em] text-blue-500">
                    Obra / Cierre
                  </p>
                  <h2 class="mt-2 text-2xl font-black text-slate-950">Finalizar obra</h2>
                  <p class="mt-1 text-base text-slate-500">
                    Revisa materiales y herramientas antes de cerrar la obra.
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  (click)="closeFinalizeModal()"
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

              <div class="grid gap-6 px-6 py-6 xl:grid-cols-[220px_1fr]">
                <aside class="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                  <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Pasos obligatorios
                  </p>
                  <div class="mt-4 space-y-2">
                    <button
                      type="button"
                      class="w-full rounded-2xl px-4 py-3 text-left text-base font-bold transition"
                      [class.bg-blue-700]="finalizeModalStep() === 'materiales'"
                      [class.text-white]="finalizeModalStep() === 'materiales'"
                      [class.bg-white]="finalizeModalStep() !== 'materiales'"
                      [class.text-slate-700]="finalizeModalStep() !== 'materiales'"
                      (click)="finalizeModalStep.set('materiales')"
                    >
                      1. Materiales
                    </button>
                    <button
                      type="button"
                      class="w-full rounded-2xl px-4 py-3 text-left text-base font-bold transition"
                      [class.bg-blue-700]="finalizeModalStep() === 'herramientas'"
                      [class.text-white]="finalizeModalStep() === 'herramientas'"
                      [class.bg-white]="finalizeModalStep() !== 'herramientas'"
                      [class.text-slate-700]="finalizeModalStep() !== 'herramientas'"
                      (click)="finalizeModalStep.set('herramientas')"
                    >
                      2. Herramientas
                    </button>
                  </div>
                  <div
                    class="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-base text-slate-600"
                  >
                    El cierre definitivo quedara habilitado cuando este flujo tenga su persistencia
                    final.
                  </div>
                </aside>

                <div class="space-y-5">
                  <div [hidden]="finalizeModalStep() !== 'materiales'" class="space-y-4">
                    <div class="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                      <h3 class="text-xl font-black text-slate-950">Revisión de materiales</h3>
                      <p class="mt-1 text-base text-slate-500">
                        Marca por material si vuelve sano o usado, y registra cantidad y medida
                        cuando aplique.
                      </p>
                    </div>

                    <div class="relative">
                      <span
                        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                            d="m21 21-4.35-4.35"
                          />
                          <circle cx="11" cy="11" r="7"></circle>
                        </svg>
                      </span>
                      <input
                        type="text"
                        class="w-full rounded-3xl border border-slate-200 bg-white px-12 py-3 text-base font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400"
                        placeholder="Buscar material para cerrar..."
                        [value]="finalizeMaterialSearchTerm()"
                        (input)="setFinalizeMaterialSearchTerm($any($event.target).value)"
                      />
                    </div>

                    <div class="grid gap-4 lg:grid-cols-2">
                      @for (
                        material of filteredFinalizeMaterialCards();
                        track material.id_material
                      ) {
                        <article
                          class="flex max-h-[34rem] flex-col rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                              <p
                                class="text-sm font-black uppercase tracking-[0.2em] text-blue-500"
                              >
                                Material
                              </p>
                              <h4 class="mt-1 truncate text-lg font-black text-slate-950">
                                {{ material.nombre }}
                              </h4>
                              <p class="mt-1 text-xs font-semibold text-slate-500">
                                {{ material.nombre_categoria }}
                                @if (material.medida) {
                                  · {{ material.medida }}
                                }
                                @if (material.codigo) {
                                  · {{ material.codigo }}
                                }
                              </p>
                            </div>
                            <div class="rounded-2xl bg-slate-50 px-3 py-2 text-right">
                              <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
                              >
                                Usado
                              </p>
                              <p class="text-lg font-black text-slate-950">
                                {{ material.cantidad_usada }}
                              </p>
                            </div>
                          </div>

                          <div
                            class="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sm:grid-cols-3"
                          >
                            <div class="rounded-xl bg-white px-3 py-2 text-center text-slate-700">
                              Sano
                              <span
                                class="mt-1 block text-base font-black uppercase tracking-normal text-slate-950"
                              >
                                {{ getMaterialFinalizeCompleteQuantity(material.id_material) }}
                              </span>
                            </div>
                            <div class="rounded-xl bg-white px-3 py-2 text-center text-slate-700">
                              Usado
                              <span
                                class="mt-1 block text-base font-black uppercase tracking-normal text-slate-950"
                              >
                                {{ getMaterialFinalizeUsedQuantity(material.id_material) }}
                              </span>
                            </div>
                            <div class="rounded-xl bg-white px-3 py-2 text-center text-slate-700">
                              Restante
                              <span
                                class="mt-1 block text-base font-black uppercase tracking-normal text-slate-950"
                              >
                                {{ getMaterialFinalizeRemaining(material.id_material) }}
                              </span>
                            </div>
                          </div>

                          <div class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
                            <section
                              class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"
                            >
                              <div class="flex items-center justify-between gap-3">
                                <div>
                                  <p
                                    class="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700"
                                  >
                                    Material sano
                                  </p>
                                  <p class="mt-1 text-sm font-semibold text-slate-600">
                                    No requiere medida.
                                  </p>
                                </div>
                                <span
                                  class="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                                >
                                  Sin medida
                                </span>
                              </div>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                class="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
                                [value]="
                                  getMaterialFinalizeSelection(material.id_material).completos
                                "
                                (input)="
                                  setMaterialFinalizeCompleteQuantity(
                                    material.id_material,
                                    $any($event.target).value
                                  )
                                "
                                placeholder="Cantidad sana"
                              />
                            </section>

                            <section class="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                              <div class="flex items-center justify-between gap-3">
                                <div>
                                  <p
                                    class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700"
                                  >
                                    Material usado
                                  </p>
                                  <p class="mt-1 text-sm font-semibold text-slate-600">
                                    Cada fila usada debe llevar medida y cantidad.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  class="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                                  (click)="addMaterialFinalizeRecicladoRow(material.id_material)"
                                >
                                  + Agregar usado
                                </button>
                              </div>

                              <div class="mt-3 max-h-52 space-y-3 overflow-y-auto pr-1">
                                @for (
                                  reciclado of getMaterialFinalizeSelection(material.id_material)
                                    .reciclados;
                                  track $index
                                ) {
                                  <div class="rounded-2xl border border-blue-100 bg-white p-3">
                                    <div class="mb-3 flex items-center justify-between gap-2">
                                      <span
                                        class="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                                      >
                                        Usado
                                      </span>
                                      <span
                                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
                                      >
                                        Fila {{ $index + 1 }}
                                      </span>
                                    </div>

                                    <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_40px]">
                                      <input
                                        type="text"
                                        class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                                        [value]="reciclado.medida"
                                        (input)="
                                          setMaterialFinalizeRecicladoMeasure(
                                            material.id_material,
                                            $index,
                                            $any($event.target).value
                                          )
                                        "
                                        placeholder="Medida"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"
                                        [value]="reciclado.cantidad"
                                        (input)="
                                          setMaterialFinalizeRecicladoQuantity(
                                            material.id_material,
                                            $index,
                                            $any($event.target).value
                                          )
                                        "
                                        placeholder="Cant."
                                      />
                                      <button
                                        type="button"
                                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                                        (click)="
                                          removeMaterialFinalizeRecicladoRow(
                                            material.id_material,
                                            $index
                                          )
                                        "
                                        title="Quitar fila"
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
                                            d="M3 6h18"
                                          />
                                          <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="m8 6 1-2h6l1 2"
                                          />
                                          <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M6 6l1 14h10l1-14"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                }

                                @if (
                                  getMaterialFinalizeSelection(material.id_material).reciclados
                                    .length === 0
                                ) {
                                  <div
                                    class="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-3 text-sm text-slate-500"
                                  >
                                    Agrega una o varias filas de material usado con su medida y
                                    cantidad.
                                  </div>
                                }
                              </div>
                            </section>
                          </div>
                        </article>
                      }

                      @if (filteredFinalizeMaterialCards().length === 0) {
                        <div
                          class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-base text-slate-500 md:col-span-2 xl:col-span-3"
                        >
                          No hay materiales para revisar.
                        </div>
                      }
                    </div>

                    <div
                      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base font-medium text-rose-700"
                      [hidden]="!materialFinalizeSaveError()"
                    >
                      {{ materialFinalizeSaveError() }}
                    </div>

                    @if (materialFinalizeValidationError()) {
                      <div
                        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-medium text-amber-700"
                      >
                        {{ materialFinalizeValidationError() }}
                      </div>
                    }

                    <div
                      class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-700"
                      [hidden]="!materialFinalizeSaveSuccess()"
                    >
                      {{ materialFinalizeSaveSuccess() }}
                    </div>

                    <div class="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        (click)="closeFinalizeModal()"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        [disabled]="
                          isSavingFinalizeMaterials() ||
                          !materialFinalizeHasChanges() ||
                          !!materialFinalizeValidationError()
                        "
                        (click)="saveFinalizeMateriales()"
                      >
                        {{ isSavingFinalizeMaterials() ? 'Guardando...' : 'Guardar materiales' }}
                      </button>
                    </div>
                  </div>

                  <div [hidden]="finalizeModalStep() !== 'herramientas'" class="space-y-4">
                    <div class="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                      <h3 class="text-xl font-black text-slate-950">Revisión de herramientas</h3>
                      <p class="mt-1 text-base text-slate-500">
                        Distribuye cada herramienta entre buen estado, dañada y perdida.
                      </p>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-4">
                      <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          Asignadas
                        </p>
                        <p class="mt-2 text-2xl font-black text-slate-950">
                          {{ herramientaTotals().asignadas }}
                        </p>
                      </div>
                      <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          En obra
                        </p>
                        <p class="mt-2 text-2xl font-black text-blue-700">
                          {{ herramientaTotals().enObra }}
                        </p>
                      </div>
                      <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          Devueltas
                        </p>
                        <p class="mt-2 text-2xl font-black text-emerald-700">
                          {{ herramientaTotals().devueltas }}
                        </p>
                      </div>
                      <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          Pendientes
                        </p>
                        <p class="mt-2 text-2xl font-black text-amber-600">
                          {{ herramientaTotals().enObra }}
                        </p>
                      </div>
                    </div>

                    <div class="grid gap-4 lg:grid-cols-2">
                      @for (
                        herramienta of toolDetail()?.herramientas ?? [];
                        track herramienta.id_herramienta
                      ) {
                        <article
                          class="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <h4 class="text-base font-black text-slate-950">
                              {{ herramienta.nombre_herramienta }}
                            </h4>
                            <span
                              class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600"
                            >
                              Asignada: {{ herramienta.cantidad_asignada }}
                            </span>
                          </div>

                          <div class="mt-4 grid gap-3 sm:grid-cols-3">
                            <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                              <label
                                class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700"
                                >Buen estado</label
                              >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                class="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
                                [value]="
                                  getToolFinalizeSelection(herramienta.id_herramienta).devuelta
                                "
                                (input)="
                                  setToolFinalizeQuantity(
                                    herramienta.id_herramienta,
                                    'devuelta',
                                    $any($event.target).value
                                  )
                                "
                                placeholder="0"
                              />
                            </div>

                            <div class="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                              <label
                                class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700"
                                >Dañada</label
                              >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                class="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                                [value]="
                                  getToolFinalizeSelection(herramienta.id_herramienta).danada
                                "
                                (input)="
                                  setToolFinalizeQuantity(
                                    herramienta.id_herramienta,
                                    'danada',
                                    $any($event.target).value
                                  )
                                "
                                placeholder="0"
                              />
                            </div>

                            <div class="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                              <label
                                class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700"
                                >Perdida</label
                              >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-rose-400"
                                [value]="
                                  getToolFinalizeSelection(herramienta.id_herramienta).perdida
                                "
                                (input)="
                                  setToolFinalizeQuantity(
                                    herramienta.id_herramienta,
                                    'perdida',
                                    $any($event.target).value
                                  )
                                "
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div
                            class="mt-3 rounded-xl border border-dashed px-3 py-2 text-sm font-semibold"
                            [class.border-emerald-200]="
                              getToolFinalizeDifference(herramienta.id_herramienta) === 0
                            "
                            [class.bg-emerald-50]="
                              getToolFinalizeDifference(herramienta.id_herramienta) === 0
                            "
                            [class.text-emerald-700]="
                              getToolFinalizeDifference(herramienta.id_herramienta) === 0
                            "
                            [class.border-amber-200]="
                              getToolFinalizeDifference(herramienta.id_herramienta) !== 0
                            "
                            [class.bg-amber-50]="
                              getToolFinalizeDifference(herramienta.id_herramienta) !== 0
                            "
                            [class.text-amber-700]="
                              getToolFinalizeDifference(herramienta.id_herramienta) !== 0
                            "
                          >
                            Total seleccionado:
                            {{ getToolFinalizeTotal(herramienta.id_herramienta) }} /
                            {{ getToolFinalizeAssigned(herramienta.id_herramienta) }}
                          </div>
                        </article>
                      }

                      @if ((toolDetail()?.herramientas?.length ?? 0) === 0) {
                        <div
                          class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 lg:col-span-2"
                        >
                          No hay herramientas asignadas para finalizar.
                        </div>
                      }
                    </div>

                    <div
                      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                      [hidden]="!toolFinalizeSaveError()"
                    >
                      {{ toolFinalizeSaveError() }}
                    </div>

                    @if (toolFinalizeValidationError()) {
                      <div
                        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700"
                      >
                        {{ toolFinalizeValidationError() }}
                      </div>
                    }

                    <div
                      class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                      [hidden]="!toolFinalizeSaveSuccess()"
                    >
                      {{ toolFinalizeSaveSuccess() }}
                    </div>
                  </div>

                  <div class="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      (click)="closeFinalizeModal()"
                    >
                      Cerrar
                    </button>
                    @if (finalizeModalStep() === 'herramientas') {
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        [disabled]="
                          isSavingFinalizeTools() ||
                          !toolFinalizeHasChanges() ||
                          !!toolFinalizeValidationError()
                        "
                        (click)="saveFinalizeHerramientas()"
                      >
                        {{ isSavingFinalizeTools() ? 'Guardando...' : 'Guardar herramientas' }}
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-base font-bold text-white transition hover:bg-blue-800"
                        disabled
                      >
                        Próximo paso: finalizar obra
                      </button>
                    }
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ObraDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly obraService = inject(ObraService);
  private readonly sucursalService = inject(SucursalService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ObraDetailViewModel | null>(null);
  readonly detailSafe = computed<ObraDetailViewModel>(
    () =>
      this.detail() ?? {
        idObra: this.currentObraId(),
        projectIdLabel: '',
        statusLabel: '',
        deadlineLabel: '',
        progreso: 0,
        nombreObra: '',
        ubicacion: '',
        nombreCliente: '',
        fechaInicio: '',
        fechaFin: '',
        precioTotal: 0,
        saldo: 0,
        pagado: 0,
        pendiente: 0,
        pagadoPorcentaje: 0,
        pendientePorcentaje: 0,
        personales: [],
      },
  );
  readonly currentObraId = signal(0);
  readonly activeTab = signal<ObraDetailTab>('general');
  readonly isPersonalModalOpen = signal(false);
  readonly isPersonalPaymentModalOpen = signal(false);
  readonly isFinalizeModalOpen = signal(false);
  readonly finalizeModalStep = signal<FinalizeWorkStep>('materiales');
  readonly finalizeMaterialSearchTerm = signal('');
  readonly materialFinalizeSelection = signal<Record<number, MaterialFinalizeSelection>>({});
  readonly materialFinalizeBaselineKey = signal('');
  readonly materialFinalizeSaveError = signal<string | null>(null);
  readonly materialFinalizeSaveSuccess = signal<string | null>(null);
  readonly isSavingFinalizeMaterials = signal(false);
  readonly toolFinalizeSelection = signal<Record<number, ToolFinalizeSelection>>({});
  readonly toolFinalizeBaselineKey = signal('');
  readonly toolFinalizeSaveError = signal<string | null>(null);
  readonly toolFinalizeSaveSuccess = signal<string | null>(null);
  readonly isSavingFinalizeTools = signal(false);
  readonly pendingRemovedUserIds = signal<Record<number, boolean>>({});
  readonly selectedPersonalPaymentUserId = signal(0);
  readonly selectedPersonalMovementId = signal(0);
  readonly personalPayments = signal<ObraPersonalPagoDetalleResumen | null>(null);
  readonly personalPaymentsLoading = signal(false);
  readonly personalPaymentsError = signal<string | null>(null);
  readonly debtPayments = signal<ObraDeudaDetalle | null>(null);
  readonly debtPaymentsLoading = signal(false);
  readonly debtPaymentsError = signal<string | null>(null);
  readonly selectedDebtPaymentId = signal(0);
  readonly isDeletingDebtPayment = signal(false);
  readonly isDebtPaymentModalOpen = signal(false);
  readonly isSavingDebtPayment = signal(false);
  readonly debtPaymentFormError = signal<string | null>(null);
  readonly materialDetail = signal<ObraMaterialDetalle | null>(null);
  readonly materialLoading = signal(false);
  readonly materialError = signal<string | null>(null);
  readonly materialSearchTerm = signal('');
  readonly materialTotalAcordado = signal(0);
  readonly materialTotalAcordadoManual = signal(false);
  readonly materialCatalogItems = signal<ObraMaterialDisponible[]>([]);
  readonly materialCatalogLoading = signal(false);
  readonly materialCatalogError = signal<string | null>(null);
  readonly materialCatalogSearchTerm = signal('');
  readonly materialCatalogSelection = signal<MaterialCatalogSelection>({});
  readonly materialCatalogSucursalId = signal(0);
  readonly isMaterialCatalogOpen = signal(false);
  readonly materialBaselineKey = signal('');
  readonly isSavingMaterial = signal(false);
  readonly materialSaveError = signal<string | null>(null);
  readonly materialSaveSuccess = signal<string | null>(null);
  readonly toolDetail = signal<ObraHerramientaDetalle | null>(null);
  readonly toolLoading = signal(false);
  readonly toolError = signal<string | null>(null);
  readonly toolSearchTerm = signal('');
  readonly toolCatalogItems = signal<ObraHerramientaDisponible[]>([]);
  readonly toolCatalogLoading = signal(false);
  readonly toolCatalogError = signal<string | null>(null);
  readonly toolCatalogSearchTerm = signal('');
  readonly toolCatalogSelection = signal<ToolCatalogSelection>({});
  readonly toolCatalogSucursalId = signal(0);
  readonly isToolCatalogOpen = signal(false);
  readonly toolBaselineKey = signal('');
  readonly isSavingTool = signal(false);
  readonly toolSaveError = signal<string | null>(null);
  readonly toolSaveSuccess = signal<string | null>(null);
  readonly editingToolId = signal(0);
  readonly debtPaymentForm = signal<DebtPaymentFormState>({
    fecha_pactada: this.getTodayIsoDate(),
    monto_pactado: '',
  });
  readonly isSavingPersonal = signal(false);
  readonly movementForm = signal<PersonalMovimientoFormState>({
    tipo: 'adelanto',
    monto: '',
    descripcion: '',
    fecha: this.getTodayIsoDate(),
  });

  readonly personalUserIds = computed(() => {
    const detail = this.detail();

    if (!detail) {
      return [] as number[];
    }

    return detail.personales
      .map((personal) => this.toNumber(personal.id_usuario))
      .filter((idUsuario) => idUsuario > 0);
  });

  readonly selectedPersonalPayment = computed(() => {
    const summary = this.personalPayments();
    const selectedId = this.selectedPersonalPaymentUserId();

    if (!summary || selectedId <= 0) {
      return null;
    }

    return (
      summary.personales.find((personal) => this.toNumber(personal.id_usuario) === selectedId) ??
      null
    );
  });

  readonly debtOverview = computed(() => {
    const deuda = this.debtPayments();
    const totalAcordado = Math.max(this.toNumber(deuda?.precio_total), 0);
    const saldoPendiente = Math.max(this.toNumber(deuda?.saldo), 0);
    const totalPagado = Math.max(totalAcordado - saldoPendiente, 0);
    const pagadoPorcentaje =
      totalAcordado > 0
        ? Math.max(0, Math.min(100, Math.round((totalPagado / totalAcordado) * 100)))
        : 0;
    const pendientePorcentaje =
      totalAcordado > 0
        ? Math.max(0, Math.min(100, Math.round((saldoPendiente / totalAcordado) * 100)))
        : 0;

    return {
      totalAcordado,
      totalPagado,
      saldoPendiente,
      pagadoPorcentaje,
      pendientePorcentaje,
      pagos: deuda?.pagos ?? [],
    };
  });

  readonly filteredMateriales = computed(() => {
    const term = this.normalizeSearchText(this.materialSearchTerm());
    const materiales = this.materialDetail()?.materiales ?? [];

    if (!term) {
      return materiales;
    }

    return materiales.filter((material) => {
      const haystack = this.normalizeSearchText(
        [material.nombre, material.codigo, material.medida, material.nombre_categoria]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(term);
    });
  });

  readonly materialTotals = computed(() => {
    const detail = this.materialDetail();
    const subtotalApi = this.toNumber(detail?.precio_materiales);
    const subtotalFallback = this.calculateMaterialSubtotal(detail?.materiales ?? []);
    const subtotalMateriales = subtotalApi > 0 ? subtotalApi : subtotalFallback;
    const manoObra = this.toNumber(detail?.precio_mano_obra);
    const totalSugerido = subtotalMateriales + manoObra;
    const totalAcordado = this.toNumber(this.materialTotalAcordado()) || totalSugerido;

    return {
      subtotalMateriales,
      manoObra,
      totalSugerido,
      totalAcordado,
    };
  });

  readonly filteredMaterialCatalogItems = computed(() => {
    const term = this.normalizeSearchText(this.materialCatalogSearchTerm());
    const items = this.materialCatalogItems();

    if (!term) {
      return items;
    }

    return items.filter((material) => {
      const haystack = this.normalizeSearchText(
        [
          material.nombre,
          material.codigo,
          material.medida,
          material.nombre_categoria,
          material.nombre_color,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(term);
    });
  });

  readonly filteredFinalizeMaterialCards = computed(() => {
    const term = this.normalizeSearchText(this.finalizeMaterialSearchTerm());
    const items = this.materialDetail()?.materiales ?? [];

    if (!term) {
      return items;
    }

    return items.filter((material) => {
      const haystack = this.normalizeSearchText(
        [material.nombre, material.codigo, material.medida, material.nombre_categoria]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(term);
    });
  });

  readonly materialFinalizeHasChanges = computed(() => {
    const payload = this.buildMaterialFinalizePayload();

    if (!payload) {
      return false;
    }

    return this.serializeFinalizeMaterials(payload) !== this.materialFinalizeBaselineKey();
  });

  readonly materialFinalizeValidationError = computed(() =>
    this.getMaterialFinalizeValidationError(),
  );

  readonly materialHasChanges = computed(() => {
    const detail = this.materialDetail();
    if (!detail) {
      return false;
    }

    const currentKey = this.serializeMaterials(detail.materiales ?? []);
    return currentKey !== this.materialBaselineKey();
  });

  readonly selectedMaterialCount = computed(
    () => Object.values(this.materialCatalogSelection()).filter((qty) => qty > 0).length,
  );

  readonly filteredHerramientas = computed(() => {
    const term = this.normalizeSearchText(this.toolSearchTerm());
    const herramientas = this.toolDetail()?.herramientas ?? [];

    if (!term) {
      return herramientas;
    }

    return herramientas.filter((herramienta) => {
      const haystack = this.normalizeSearchText(
        [
          herramienta.nombre_herramienta,
          herramienta.cantidad_asignada,
          herramienta.cantidad_devuelta,
          herramienta.cantidad_danada,
          herramienta.cantidad_perdida,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(term);
    });
  });

  readonly herramientaTotals = computed(() => {
    const herramientas = this.toolDetail()?.herramientas ?? [];

    return herramientas.reduce(
      (totals, herramienta) => {
        totals.asignadas += this.toNumber(herramienta.cantidad_asignada);
        totals.devueltas += this.toNumber(herramienta.cantidad_devuelta);
        totals.danadas += this.toNumber(herramienta.cantidad_danada);
        totals.perdidas += this.toNumber(herramienta.cantidad_perdida);
        totals.enObra += this.toNumber(herramienta.en_obra);
        return totals;
      },
      { asignadas: 0, devueltas: 0, danadas: 0, perdidas: 0, enObra: 0 },
    );
  });

  readonly toolHasChanges = computed(() => {
    const detail = this.toolDetail();

    if (!detail) {
      return false;
    }

    const currentKey = this.serializeTools(detail.herramientas ?? []);
    return currentKey !== this.toolBaselineKey();
  });

  readonly toolFinalizeHasChanges = computed(() => {
    const payload = this.buildToolFinalizePayload();

    if (!payload) {
      return false;
    }

    return this.serializeFinalizeTools(payload) !== this.toolFinalizeBaselineKey();
  });

  readonly toolFinalizeValidationError = computed(() => this.getToolFinalizeValidationError());

  readonly selectedToolCount = computed(
    () => Object.values(this.toolCatalogSelection()).filter((qty) => qty > 0).length,
  );

  readonly filteredToolCatalogItems = computed(() => {
    const term = this.normalizeSearchText(this.toolCatalogSearchTerm());
    const items = this.toolCatalogItems();

    if (!term) {
      return items;
    }

    return items.filter((herramienta) => {
      const haystack = this.normalizeSearchText(
        [herramienta.nombre, herramienta.nombre_categoria_herramienta].filter(Boolean).join(' '),
      );

      return haystack.includes(term);
    });
  });

  readonly selectedDebtPayment = computed(() => {
    const selectedId = this.selectedDebtPaymentId();

    if (selectedId <= 0) {
      return null;
    }

    return (
      this.debtOverview().pagos.find((pago) => this.toNumber(pago.id_obra_pago) === selectedId) ??
      null
    );
  });

  readonly pendingRemovedCount = computed(() => Object.keys(this.pendingRemovedUserIds()).length);

  readonly projectManagerLabel = 'Equipo Obra';

  readonly tabs: Array<{ id: ObraDetailTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'personal', label: 'Personal' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'material', label: 'Material' },
    { id: 'herramientas', label: 'Herramientas' },
  ];

  ngOnInit(): void {
    const idObra = this.toNumber(this.route.snapshot.paramMap.get('id_obra'));
    const routePath = this.route.snapshot.routeConfig?.path ?? '';

    if (idObra <= 0) {
      this.error.set('No se encontro una obra valida para mostrar.');
      return;
    }

    this.currentObraId.set(idObra);
    this.activeTab.set(routePath.includes('detalle/pagos') ? 'pagos' : 'general');

    this.loadDetail(idObra);
  }

  setActiveTab(tab: ObraDetailTab): void {
    this.activeTab.set(tab);

    if (tab === 'personal') {
      this.ensurePersonalPaymentsSelection();
    }

    if (tab === 'pagos') {
      this.loadDebtPayments();
    }

    if (tab === 'material') {
      this.loadMaterialDetail();
    }

    if (tab === 'herramientas') {
      this.loadToolDetail();
    }
  }

  openPersonalModal(): void {
    this.isPersonalModalOpen.set(true);
  }

  openFinalizeModal(): void {
    this.isFinalizeModalOpen.set(true);
    this.finalizeModalStep.set('materiales');
    this.finalizeMaterialSearchTerm.set('');
    this.materialFinalizeSaveError.set(null);
    this.materialFinalizeSaveSuccess.set(null);
    this.materialFinalizeBaselineKey.set('');
    this.toolFinalizeSaveError.set(null);
    this.toolFinalizeSaveSuccess.set(null);
    this.toolFinalizeBaselineKey.set('');
    this.isSavingFinalizeTools.set(false);
    this.toolFinalizeSelection.set({});
    this.resetMaterialFinalizeSelection();
    this.loadMaterialDetail();
    this.loadToolDetail();
  }

  closeFinalizeModal(): void {
    this.isFinalizeModalOpen.set(false);
    this.finalizeMaterialSearchTerm.set('');
    this.materialFinalizeBaselineKey.set('');
    this.materialFinalizeSaveError.set(null);
    this.materialFinalizeSaveSuccess.set(null);
    this.isSavingFinalizeMaterials.set(false);
    this.toolFinalizeBaselineKey.set('');
    this.toolFinalizeSaveError.set(null);
    this.toolFinalizeSaveSuccess.set(null);
    this.isSavingFinalizeTools.set(false);
    this.toolFinalizeSelection.set({});
    this.resetMaterialFinalizeSelection();
  }

  setFinalizeMaterialSearchTerm(value: unknown): void {
    this.finalizeMaterialSearchTerm.set(this.toText(value));
  }

  setMaterialFinalizeMode(idMaterial: number, mode: MaterialFinalizeMode): void {
    const normalizedId = this.toNumber(idMaterial);

    if (normalizedId <= 0) {
      return;
    }

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId] ?? {
        mode: null,
        completos: '',
        reciclados: [],
      };

      next[normalizedId] = {
        ...existing,
        mode,
      };

      return next;
    });
  }

  setMaterialFinalizeCompleteQuantity(idMaterial: number, value: unknown): void {
    const normalizedId = this.toNumber(idMaterial);
    const quantity = this.toText(value);

    if (normalizedId <= 0) {
      return;
    }

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId] ?? {
        mode: 'completo' as MaterialFinalizeMode,
        completos: '',
        reciclados: [],
      };

      next[normalizedId] = {
        ...existing,
        mode: 'completo',
        completos: quantity,
      };

      return next;
    });
  }

  addMaterialFinalizeRecicladoRow(idMaterial: number): void {
    const normalizedId = this.toNumber(idMaterial);

    if (normalizedId <= 0) {
      return;
    }

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId] ?? {
        mode: 'reciclado' as MaterialFinalizeMode,
        completos: '',
        reciclados: [],
      };

      next[normalizedId] = {
        ...existing,
        mode: 'reciclado',
        reciclados: [...existing.reciclados, { medida: '', cantidad: '' }],
      };

      return next;
    });
  }

  saveFinalizeMateriales(): void {
    const idObra = this.currentObraId();
    const payload = this.buildMaterialFinalizePayload();
    const validationError = this.getMaterialFinalizeValidationError();
    const hasHistory = this.hasPersistedMaterialFinalizeHistory();

    if (validationError) {
      this.materialFinalizeSaveError.set(validationError);
      return;
    }

    if (idObra <= 0 || this.isSavingFinalizeMaterials() || payload === null) {
      return;
    }

    this.isSavingFinalizeMaterials.set(true);
    this.materialFinalizeSaveError.set(null);
    this.materialFinalizeSaveSuccess.set(null);

    const request$ = hasHistory
      ? this.obraService.actualizarMaterialesReciclados({
          id_obra: idObra,
          materiales_completos: payload.materiales_completos,
          materiales_reciclados: payload.materiales_reciclados,
        })
      : this.obraService.registrarMaterialesReciclados({
          id_obra: idObra,
          materiales_completos: payload.materiales_completos,
          materiales_reciclados: payload.materiales_reciclados,
        });

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingFinalizeMaterials.set(false)),
      )
      .subscribe({
        next: (response) => {
          const successMessage =
            this.toText(response.message) ||
            (hasHistory
              ? 'Materiales reciclados actualizados correctamente.'
              : 'Materiales reciclados registrados correctamente.');
          this.materialFinalizeSaveSuccess.set(successMessage);
          this.materialFinalizeBaselineKey.set(this.serializeFinalizeMaterials(payload));
          window.alert(successMessage);
          this.loadMaterialDetail();
        },
        error: () => {
          this.materialFinalizeSaveError.set('No se pudieron guardar los materiales del cierre.');
        },
      });
  }

  private hasPersistedMaterialFinalizeHistory(): boolean {
    const detail = this.materialDetail();

    if (!detail) {
      return false;
    }

    for (const material of detail.materiales ?? []) {
      const history = material.cantidad_devuelta ?? [];

      if (
        history.some((evento) => {
          const cantidad = this.toNumber(evento.cantidad);
          return cantidad > 0;
        })
      ) {
        return true;
      }
    }

    return false;
  }

  private buildMaterialFinalizePayload(): ObraMaterialRecicladosPayload | null {
    const detail = this.materialDetail();

    if (!detail) {
      return null;
    }

    const selection = this.materialFinalizeSelection();
    const materialesCompletos: ObraMaterialRecicladoCompletosPayload[] = [];
    const materialesReciclados: ObraMaterialRecicladoItemPayload[] = [];

    for (const material of detail.materiales ?? []) {
      const normalizedId = this.toNumber(material.id_material);
      const item = selection[normalizedId];

      if (!item) {
        continue;
      }

      const cantidadCompleta = this.toNumber(item.completos);

      if (cantidadCompleta > 0) {
        materialesCompletos.push({
          id_material: normalizedId,
          cantidad: cantidadCompleta,
        });
      }

      for (const reciclado of item.reciclados) {
        const medida = this.toText(reciclado.medida);
        const cantidad = this.toNumber(reciclado.cantidad);

        if (!medida || cantidad <= 0) {
          continue;
        }

        materialesReciclados.push({
          id_material: normalizedId,
          medida,
          cantidad,
        });
      }
    }

    if (materialesCompletos.length === 0 && materialesReciclados.length === 0) {
      return null;
    }

    return {
      id_obra: this.currentObraId(),
      materiales_completos: materialesCompletos,
      materiales_reciclados: materialesReciclados,
    };
  }

  setToolFinalizeQuantity(
    idHerramienta: number,
    field: keyof ToolFinalizeSelection,
    value: unknown,
  ): void {
    const normalizedId = this.toNumber(idHerramienta);
    const quantity = this.toText(value);

    if (normalizedId <= 0) {
      return;
    }

    this.toolFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId] ?? {
        devuelta: '',
        danada: '',
        perdida: '',
      };

      next[normalizedId] = {
        ...existing,
        [field]: quantity,
      };

      return next;
    });
  }

  getToolFinalizeSelection(idHerramienta: number): ToolFinalizeSelection {
    return (
      this.toolFinalizeSelection()[this.toNumber(idHerramienta)] ?? {
        devuelta: '',
        danada: '',
        perdida: '',
      }
    );
  }

  getToolFinalizeAssigned(idHerramienta: number): number {
    const herramienta = this.toolDetail()?.herramientas.find(
      (item) => this.toNumber(item.id_herramienta) === this.toNumber(idHerramienta),
    );

    return this.toNumber(herramienta?.cantidad_asignada);
  }

  getToolFinalizeTotal(idHerramienta: number): number {
    const selection = this.getToolFinalizeSelection(idHerramienta);

    return (
      this.toNumber(selection.devuelta) +
      this.toNumber(selection.danada) +
      this.toNumber(selection.perdida)
    );
  }

  getToolFinalizeDifference(idHerramienta: number): number {
    return this.getToolFinalizeAssigned(idHerramienta) - this.getToolFinalizeTotal(idHerramienta);
  }

  saveFinalizeHerramientas(): void {
    const idObra = this.currentObraId();
    const payload = this.buildToolFinalizePayload();
    const validationError = this.getToolFinalizeValidationError();
    const hasHistory = this.hasPersistedToolFinalizeHistory();

    if (validationError) {
      this.toolFinalizeSaveError.set(validationError);
      return;
    }

    if (idObra <= 0 || this.isSavingFinalizeTools() || payload === null) {
      return;
    }

    this.isSavingFinalizeTools.set(true);
    this.toolFinalizeSaveError.set(null);
    this.toolFinalizeSaveSuccess.set(null);

    const request$ = hasHistory
      ? this.obraService.actualizarDevolucionHerramientas(payload)
      : this.obraService.registrarDevolucionHerramientas(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingFinalizeTools.set(false)),
      )
      .subscribe({
        next: (response) => {
          const successMessage =
            this.toText(response.message) ||
            (hasHistory
              ? 'Devolución de herramientas actualizada correctamente.'
              : 'Devolución de herramientas registrada correctamente.');

          this.toolFinalizeSaveSuccess.set(successMessage);
          this.toolFinalizeBaselineKey.set(this.serializeFinalizeTools(payload));
          window.alert(successMessage);
          this.loadToolDetail();
        },
        error: () => {
          this.toolFinalizeSaveError.set('No se pudieron guardar las herramientas del cierre.');
        },
      });
  }

  private buildToolFinalizePayload(): ObraHerramientaDevolucionPayload | null {
    const detail = this.toolDetail();

    if (!detail) {
      return null;
    }

    const selection = this.toolFinalizeSelection();
    const herramientas = (detail.herramientas ?? []).map((item) => {
      const normalizedId = this.toNumber(item.id_herramienta);
      const selected = selection[normalizedId] ?? {
        devuelta: '',
        danada: '',
        perdida: '',
      };

      return {
        id_herramienta: normalizedId,
        cantidad_devuelta: this.toNumber(selected.devuelta),
        cantidad_danada: this.toNumber(selected.danada),
        cantidad_perdida: this.toNumber(selected.perdida),
      };
    });

    if (herramientas.length === 0) {
      return null;
    }

    return {
      id_obra: this.currentObraId(),
      herramientas,
    };
  }

  private serializeFinalizeTools(payload: ObraHerramientaDevolucionPayload): string {
    return payload.herramientas
      .map(
        (item) =>
          `${this.toNumber(item.id_herramienta)}:${this.toNumber(item.cantidad_devuelta)}:${this.toNumber(item.cantidad_danada)}:${this.toNumber(item.cantidad_perdida)}`,
      )
      .sort()
      .join('|');
  }

  private getToolFinalizeValidationError(): string | null {
    const herramientas = this.toolDetail()?.herramientas ?? [];

    for (const herramienta of herramientas) {
      const normalizedId = this.toNumber(herramienta.id_herramienta);
      const assigned = this.toNumber(herramienta.cantidad_asignada);
      const selection = this.getToolFinalizeSelection(normalizedId);
      const devuelta = this.toNumber(selection.devuelta);
      const danada = this.toNumber(selection.danada);
      const perdida = this.toNumber(selection.perdida);

      if (devuelta < 0 || danada < 0 || perdida < 0) {
        return `Las cantidades de ${herramienta.nombre_herramienta} no pueden ser negativas.`;
      }

      const total = devuelta + danada + perdida;

      if (total !== assigned) {
        return `La suma de estados para ${herramienta.nombre_herramienta} debe ser exactamente ${assigned}.`;
      }
    }

    return null;
  }

  private hasPersistedToolFinalizeHistory(): boolean {
    const herramientas = this.toolDetail()?.herramientas ?? [];

    return herramientas.some(
      (item) =>
        this.toNumber(item.cantidad_devuelta) > 0 ||
        this.toNumber(item.cantidad_danada) > 0 ||
        this.toNumber(item.cantidad_perdida) > 0,
    );
  }

  private getMaterialFinalizeValidationError(): string | null {
    const detail = this.materialDetail();
    const materials = detail?.materiales ?? [];

    for (const material of materials) {
      const normalizedId = this.toNumber(material.id_material);
      const selection = this.getMaterialFinalizeSelection(normalizedId);
      const completos = this.toNumber(selection.completos);
      const cantidadUsada = this.toNumber(material.cantidad_usada);

      if (completos < 0) {
        return `La cantidad sana de ${material.nombre} no puede ser negativa.`;
      }

      for (const reciclado of selection.reciclados) {
        const cantidad = this.toNumber(reciclado.cantidad);
        const medida = this.toText(reciclado.medida);

        if (cantidad > 0 && !medida) {
          return `El material usado ${material.nombre} necesita medida en cada fila.`;
        }
      }

      if (completos > cantidadUsada) {
        return `La cantidad sana de ${material.nombre} supera la cantidad usada disponible.`;
      }
    }

    return null;
  }

  getMaterialFinalizeCompleteQuantity(idMaterial: number): number {
    return this.toNumber(this.getMaterialFinalizeSelection(idMaterial).completos);
  }

  getMaterialFinalizeUsedQuantity(idMaterial: number): number {
    return this.getMaterialFinalizeSelection(idMaterial).reciclados.reduce(
      (total, item) => total + this.toNumber(item.cantidad),
      0,
    );
  }

  private resetMaterialFinalizeSelection(): void {
    this.materialFinalizeSelection.set({});
  }

  private hydrateMaterialFinalizeSelection(detail: ObraMaterialDetalle): void {
    const nextSelection: Record<number, MaterialFinalizeSelection> = {};

    for (const material of detail.materiales ?? []) {
      const normalizedId = this.toNumber(material.id_material);
      const history = material.cantidad_devuelta ?? [];

      if (normalizedId <= 0 || history.length === 0) {
        continue;
      }

      const completos = history
        .filter((evento) => this.normalizeFinalizeEventType(evento.tipo) === 'completo')
        .reduce((total, evento) => total + this.toNumber(evento.cantidad), 0);

      const recicladosByMeasure = new Map<string, MaterialFinalizeRecicladoForm>();

      for (const evento of history) {
        if (this.normalizeFinalizeEventType(evento.tipo) !== 'reciclado') {
          continue;
        }

        const medida = this.toText(evento.medida);
        const cantidad = this.toNumber(evento.cantidad);

        if (!medida || cantidad <= 0) {
          continue;
        }

        const existing = recicladosByMeasure.get(medida);

        if (existing) {
          existing.cantidad = String(this.toNumber(existing.cantidad) + cantidad);
          continue;
        }

        recicladosByMeasure.set(medida, {
          medida,
          cantidad: String(cantidad),
        });
      }

      nextSelection[normalizedId] = {
        mode: recicladosByMeasure.size > 0 ? 'reciclado' : 'completo',
        completos: completos > 0 ? String(completos) : '',
        reciclados: Array.from(recicladosByMeasure.values()),
      };
    }

    this.materialFinalizeSelection.set(nextSelection);
  }

  private hydrateToolFinalizeSelection(detail: ObraHerramientaDetalle): void {
    const nextSelection: Record<number, ToolFinalizeSelection> = {};

    for (const herramienta of detail.herramientas ?? []) {
      const normalizedId = this.toNumber(herramienta.id_herramienta);

      if (normalizedId <= 0) {
        continue;
      }

      nextSelection[normalizedId] = {
        devuelta:
          this.toNumber(herramienta.cantidad_devuelta) > 0
            ? String(this.toNumber(herramienta.cantidad_devuelta))
            : '',
        danada:
          this.toNumber(herramienta.cantidad_danada) > 0
            ? String(this.toNumber(herramienta.cantidad_danada))
            : '',
        perdida:
          this.toNumber(herramienta.cantidad_perdida) > 0
            ? String(this.toNumber(herramienta.cantidad_perdida))
            : '',
      };
    }

    this.toolFinalizeSelection.set(nextSelection);
  }

  private serializeFinalizeMaterials(payload: ObraMaterialRecicladosPayload): string {
    const completos = payload.materiales_completos
      .map((item) => `${this.toNumber(item.id_material)}:${this.toNumber(item.cantidad)}`)
      .sort()
      .join('|');

    const reciclados = payload.materiales_reciclados
      .map(
        (item) =>
          `${this.toNumber(item.id_material)}:${this.toText(item.medida)}:${this.toNumber(item.cantidad)}`,
      )
      .sort()
      .join('|');

    return `${completos}||${reciclados}`;
  }

  private normalizeFinalizeEventType(value: unknown): 'completo' | 'reciclado' {
    return this.toText(value) === 'reciclado' ? 'reciclado' : 'completo';
  }

  removeMaterialFinalizeRecicladoRow(idMaterial: number, index: number): void {
    const normalizedId = this.toNumber(idMaterial);

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId];

      if (!existing) {
        return current;
      }

      const reciclados = existing.reciclados.filter((_, currentIndex) => currentIndex !== index);

      next[normalizedId] = {
        ...existing,
        mode: reciclados.length > 0 ? 'reciclado' : existing.mode,
        reciclados,
      };

      return next;
    });
  }

  setMaterialFinalizeRecicladoMeasure(idMaterial: number, index: number, value: unknown): void {
    const normalizedId = this.toNumber(idMaterial);
    const measure = this.toText(value);

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId];

      if (!existing || !existing.reciclados[index]) {
        return current;
      }

      const reciclados = [...existing.reciclados];
      reciclados[index] = {
        ...reciclados[index],
        medida: measure,
      };

      next[normalizedId] = {
        ...existing,
        reciclados,
      };

      return next;
    });
  }

  setMaterialFinalizeRecicladoQuantity(idMaterial: number, index: number, value: unknown): void {
    const normalizedId = this.toNumber(idMaterial);
    const quantity = this.toText(value);

    this.materialFinalizeSelection.update((current) => {
      const next = { ...current };
      const existing = next[normalizedId];

      if (!existing || !existing.reciclados[index]) {
        return current;
      }

      const reciclados = [...existing.reciclados];
      reciclados[index] = {
        ...reciclados[index],
        cantidad: quantity,
      };

      next[normalizedId] = {
        ...existing,
        reciclados,
      };

      return next;
    });
  }

  getMaterialFinalizeSelection(idMaterial: number): MaterialFinalizeSelection {
    return (
      this.materialFinalizeSelection()[this.toNumber(idMaterial)] ?? {
        mode: null,
        completos: '',
        reciclados: [],
      }
    );
  }

  getMaterialFinalizeRemaining(idMaterial: number): number {
    const detail = this.materialDetail();
    const material = detail?.materiales.find(
      (item) => this.toNumber(item.id_material) === this.toNumber(idMaterial),
    );

    if (!material) {
      return 0;
    }

    const selection = this.getMaterialFinalizeSelection(idMaterial);
    const completos = this.toNumber(selection.completos);
    const reciclados = selection.reciclados.reduce(
      (total, item) => total + this.toNumber(item.cantidad),
      0,
    );
    const cantidadUsada = this.toNumber(material.cantidad_usada);

    return Math.max(cantidadUsada - completos - reciclados, 0);
  }

  closePersonalModal(): void {
    this.isPersonalModalOpen.set(false);
  }

  openPersonalPaymentModal(idUsuario: number): void {
    const normalizedId = this.toNumber(idUsuario);

    if (normalizedId <= 0) {
      return;
    }

    this.selectPersonalPaymentWorker(normalizedId);
    this.isPersonalPaymentModalOpen.set(true);
  }

  closePersonalPaymentModal(): void {
    this.isPersonalPaymentModalOpen.set(false);
  }

  selectPersonalPaymentWorker(idUsuario: number): void {
    const normalizedId = this.toNumber(idUsuario);

    if (normalizedId <= 0) {
      return;
    }

    const currentSelected = this.selectedPersonalPaymentUserId();
    this.selectedPersonalPaymentUserId.set(normalizedId);

    if (currentSelected !== normalizedId) {
      this.cancelPersonalMovementEdit();
      this.loadPersonalPayments(normalizedId);
    }
  }

  startEditingPersonalMovement(pago: ObraPersonalPagoMovimientoDetalle): void {
    this.selectedPersonalMovementId.set(this.toNumber(pago.id_movimiento));
    this.movementForm.set({
      tipo: pago.tipo === 'descuento' ? 'descuento' : 'adelanto',
      monto: String(this.toNumber(pago.monto)),
      descripcion: this.toText(pago.descripcion),
      fecha: this.toText(pago.fecha).slice(0, 10),
    });
  }

  openDebtPaymentModalForCreate(): void {
    this.selectedDebtPaymentId.set(0);
    this.debtPaymentFormError.set(null);
    this.debtPaymentForm.set({
      fecha_pactada: this.getTodayIsoDate(),
      monto_pactado: '',
    });
    this.isDebtPaymentModalOpen.set(true);
  }

  openDebtPaymentModalForEdit(pago: ObraDeudaPago): void {
    const idObraPago = this.toNumber(pago.id_obra_pago);

    if (idObraPago <= 0) {
      return;
    }

    this.selectedDebtPaymentId.set(idObraPago);
    this.debtPaymentFormError.set(null);
    this.debtPaymentForm.set({
      fecha_pactada: this.toText(pago.fecha_pactada).slice(0, 10),
      monto_pactado: String(this.toNumber(pago.monto_pactado)),
    });
    this.isDebtPaymentModalOpen.set(true);
  }

  closeDebtPaymentModal(): void {
    this.isDebtPaymentModalOpen.set(false);
  }

  setDebtPaymentDate(value: unknown): void {
    this.debtPaymentForm.update((current) => ({
      ...current,
      fecha_pactada: this.toText(value),
    }));
  }

  setDebtPaymentAmount(value: unknown): void {
    this.debtPaymentForm.update((current) => ({
      ...current,
      monto_pactado: this.toText(value),
    }));
  }

  canSaveDebtPayment(): boolean {
    const form = this.debtPaymentForm();
    const monto = this.toNumber(form.monto_pactado);

    return this.toText(form.fecha_pactada).length > 0 && monto > 0;
  }

  saveDebtPayment(): void {
    const idObra = this.currentObraId();
    const form = this.debtPaymentForm();
    const idObraPago = this.selectedDebtPaymentId();

    if (idObra <= 0 || this.isSavingDebtPayment() || !this.canSaveDebtPayment()) {
      return;
    }

    this.isSavingDebtPayment.set(true);
    this.debtPaymentFormError.set(null);

    const payloadBase = {
      id_obra: idObra,
      fecha_pactada: this.toText(form.fecha_pactada),
      monto_pactado: this.toNumber(form.monto_pactado),
    };

    const request$ =
      idObraPago > 0
        ? this.obraService.updateObraPago({
            id_obra_pago: idObraPago,
            estado: this.toBooleanLike(this.selectedDebtPayment()?.estado ?? false),
            ...payloadBase,
          })
        : this.obraService.createObraPago(payloadBase);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingDebtPayment.set(false)),
      )
      .subscribe({
        next: () => {
          this.isDebtPaymentModalOpen.set(false);
          this.selectedDebtPaymentId.set(0);
          this.loadDebtPayments();
        },
        error: () => {
          this.debtPaymentFormError.set(
            idObraPago > 0
              ? 'No se pudo actualizar el pago pactado.'
              : 'No se pudo registrar el pago pactado.',
          );
        },
      });
  }

  markDebtPaymentAsPaid(pago: ObraDeudaPago): void {
    const idObra = this.currentObraId();
    const idObraPago = this.toNumber(pago.id_obra_pago);

    if (idObra <= 0 || idObraPago <= 0 || this.isSavingDebtPayment() || this.isDebtPagoPaid(pago)) {
      return;
    }

    this.isSavingDebtPayment.set(true);
    this.debtPaymentsError.set(null);

    this.obraService
      .updateObraPago({
        id_obra_pago: idObraPago,
        id_obra: idObra,
        fecha_pactada: this.toText(pago.fecha_pactada),
        monto_pactado: this.toNumber(pago.monto_pactado),
        estado: true,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingDebtPayment.set(false)),
      )
      .subscribe({
        next: () => {
          this.loadDebtPayments();
        },
        error: () => {
          this.debtPaymentsError.set('No se pudo marcar el pago como realizado.');
        },
      });
  }

  markDebtPaymentAsUnpaid(pago: ObraDeudaPago): void {
    const idObra = this.currentObraId();
    const idObraPago = this.toNumber(pago.id_obra_pago);

    if (
      idObra <= 0 ||
      idObraPago <= 0 ||
      this.isSavingDebtPayment() ||
      !this.isDebtPagoPaid(pago)
    ) {
      return;
    }

    this.isSavingDebtPayment.set(true);
    this.debtPaymentsError.set(null);

    this.obraService
      .updateObraPago({
        id_obra_pago: idObraPago,
        id_obra: idObra,
        fecha_pactada: this.toText(pago.fecha_pactada),
        monto_pactado: this.toNumber(pago.monto_pactado),
        estado: false,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingDebtPayment.set(false)),
      )
      .subscribe({
        next: () => {
          this.loadDebtPayments();
        },
        error: () => {
          this.debtPaymentsError.set('No se pudo marcar el pago como pendiente.');
        },
      });
  }

  setMaterialSearchTerm(value: unknown): void {
    this.materialSearchTerm.set(this.toText(value));
  }

  setMaterialTotalAcordado(value: unknown): void {
    this.materialTotalAcordadoManual.set(true);
    this.materialTotalAcordado.set(this.toNumber(value));
  }

  openMaterialCatalog(): void {
    this.isMaterialCatalogOpen.set(true);
    this.materialCatalogSearchTerm.set('');
    this.materialCatalogSelection.set({});
    this.loadMaterialCatalog(true);
  }

  closeMaterialCatalog(): void {
    this.isMaterialCatalogOpen.set(false);
  }

  setMaterialCatalogSearchTerm(value: unknown): void {
    this.materialCatalogSearchTerm.set(this.toText(value));
  }

  setMaterialCatalogQuantity(idMaterial: number, value: unknown, maxDisponible: number): void {
    const quantity = Math.min(Math.max(this.toNumber(value), 0), this.toNumber(maxDisponible));

    this.materialCatalogSelection.update((current) => {
      const next = { ...current };

      if (quantity <= 0) {
        delete next[idMaterial];
        return next;
      }

      next[idMaterial] = quantity;
      return next;
    });
  }

  applyMaterialSelection(): void {
    const selection = this.materialCatalogSelection();
    const items = this.materialCatalogItems();
    const currentDetail = this.materialDetail();

    if (Object.keys(selection).length === 0) {
      this.closeMaterialCatalog();
      return;
    }

    const materiales = currentDetail?.materiales ?? [];
    const materialMap = new Map<number, (typeof materiales)[number]>();

    for (const material of materiales) {
      materialMap.set(this.toNumber(material.id_material), { ...material });
    }

    for (const item of items) {
      const idMaterial = this.toNumber(item.id_material);
      const cantidad = this.toNumber(selection[idMaterial]);

      if (idMaterial <= 0 || cantidad <= 0) {
        continue;
      }

      const existente = materialMap.get(idMaterial);

      if (existente) {
        materialMap.set(idMaterial, {
          ...existente,
          cantidad_usada: this.toNumber(existente.cantidad_usada) + cantidad,
          precio: this.toNumber(item.precio) || this.toNumber(existente.precio),
          costo: this.toNumber(item.costo) || this.toNumber(existente.costo),
        });
      } else {
        materialMap.set(idMaterial, {
          id_material: idMaterial,
          nombre: item.nombre,
          codigo: item.codigo ?? null,
          medida: item.medida ?? null,
          id_color: this.toNumber(item.id_color),
          nombre_color: item.nombre_color,
          codigo_color: item.codigo_color,
          id_categoria: this.toNumber(item.id_categoria),
          nombre_categoria: item.nombre_categoria,
          cantidad_usada: cantidad,
          precio: this.toNumber(item.precio),
          costo: this.toNumber(item.costo),
        });
      }
    }

    const updatedMateriales = Array.from(materialMap.values());
    const subtotal = this.calculateMaterialSubtotal(updatedMateriales);
    const totalSugerido = subtotal + this.toNumber(currentDetail?.precio_mano_obra);

    this.materialDetail.set({
      precio_materiales: subtotal,
      precio_mano_obra: this.toNumber(currentDetail?.precio_mano_obra),
      precio_total: this.toNumber(currentDetail?.precio_total),
      materiales: updatedMateriales,
    });

    this.syncMaterialTotalAcordado(totalSugerido);

    this.closeMaterialCatalog();
  }

  setMaterialQuantity(idMaterial: number, value: unknown): void {
    const detail = this.materialDetail();

    if (!detail) {
      return;
    }

    const nextCantidad = Math.max(this.toNumber(value), 0);
    const updated = detail.materiales.map((material) => {
      if (this.toNumber(material.id_material) !== this.toNumber(idMaterial)) {
        return material;
      }

      return {
        ...material,
        cantidad_usada: nextCantidad,
      };
    });

    this.materialDetail.set({
      ...detail,
      materiales: updated,
      precio_materiales: this.calculateMaterialSubtotal(updated),
    });

    this.syncMaterialTotalAcordado(
      this.calculateMaterialSubtotal(updated) + this.toNumber(detail.precio_mano_obra),
    );
  }

  removeMaterialFromDetail(idMaterial: number): void {
    const detail = this.materialDetail();

    if (!detail) {
      return;
    }

    const normalizedId = this.toNumber(idMaterial);
    const updated = detail.materiales.filter(
      (material) => this.toNumber(material.id_material) !== normalizedId,
    );
    const subtotal = this.calculateMaterialSubtotal(updated);

    this.materialDetail.set({
      ...detail,
      materiales: updated,
      precio_materiales: subtotal,
    });

    this.syncMaterialTotalAcordado(subtotal + this.toNumber(detail.precio_mano_obra));
  }

  saveMaterialChanges(): void {
    const idObra = this.currentObraId();
    const detail = this.materialDetail();

    if (idObra <= 0 || !detail || this.isSavingMaterial() || !this.materialHasChanges()) {
      return;
    }

    this.isSavingMaterial.set(true);
    this.materialSaveError.set(null);
    this.materialSaveSuccess.set(null);

    const materiales = (detail.materiales ?? [])
      .map((material) => ({
        id_material: this.toNumber(material.id_material),
        cantidad_usada: this.toNumber(material.cantidad_usada),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      }))
      .filter((material) => material.id_material > 0 && material.cantidad_usada > 0);

    this.obraService
      .syncObraMateriales({
        id_obra: idObra,
        materiales,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingMaterial.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.materialDetail.set(response.data ?? null);
          this.materialSaveError.set(null);

          if (response.data) {
            this.materialBaselineKey.set(this.serializeMaterials(response.data.materiales ?? []));
            const subtotal = this.toNumber(response.data.precio_materiales);
            const fallback = this.calculateMaterialSubtotal(response.data.materiales ?? []);
            const subtotalFinal = subtotal > 0 ? subtotal : fallback;
            const totalSugerido = subtotalFinal + this.toNumber(response.data.precio_mano_obra);
            const totalApi = this.toNumber(response.data.precio_total);

            if (totalApi > 0 && !this.isSameMoney(totalApi, totalSugerido)) {
              this.materialTotalAcordadoManual.set(true);
              this.materialTotalAcordado.set(totalApi);
            } else {
              this.materialTotalAcordadoManual.set(false);
              this.materialTotalAcordado.set(totalSugerido);
            }

            const successMessage =
              this.toText(response.message) || 'Materiales sincronizados correctamente.';
            this.materialSaveSuccess.set(successMessage);
            window.alert(successMessage);
            this.clearMaterialSaveSuccessLater();
          }
        },
        error: () => {
          this.materialSaveError.set('No se pudieron guardar los cambios de materiales.');
        },
      });
  }

  setToolSearchTerm(value: unknown): void {
    this.toolSearchTerm.set(this.toText(value));
  }

  openToolCatalog(): void {
    this.isToolCatalogOpen.set(true);
    this.toolCatalogSearchTerm.set('');
    this.toolCatalogSelection.set({});
    this.loadToolCatalog(true);
  }

  closeToolCatalog(): void {
    this.isToolCatalogOpen.set(false);
  }

  setToolCatalogSearchTerm(value: unknown): void {
    this.toolCatalogSearchTerm.set(this.toText(value));
  }

  setToolCatalogQuantity(idHerramienta: number, value: unknown, maxDisponible: number): void {
    const quantity = Math.min(Math.max(this.toNumber(value), 0), this.toNumber(maxDisponible));

    this.toolCatalogSelection.update((current) => {
      const next = { ...current };

      if (quantity <= 0) {
        delete next[idHerramienta];
        return next;
      }

      next[idHerramienta] = quantity;
      return next;
    });
  }

  applyToolSelection(): void {
    const selection = this.toolCatalogSelection();
    const items = this.toolCatalogItems();
    const currentDetail = this.toolDetail();

    if (Object.keys(selection).length === 0) {
      this.closeToolCatalog();
      return;
    }

    const herramientas = currentDetail?.herramientas ?? [];
    const herramientaMap = new Map<number, (typeof herramientas)[number]>();

    for (const herramienta of herramientas) {
      herramientaMap.set(this.toNumber(herramienta.id_herramienta), { ...herramienta });
    }

    for (const item of items) {
      const idHerramienta = this.toNumber(item.id_herramienta);
      const cantidad = this.toNumber(selection[idHerramienta]);

      if (idHerramienta <= 0 || cantidad <= 0) {
        continue;
      }

      const existente = herramientaMap.get(idHerramienta);

      if (existente) {
        const cantidadAsignada = this.toNumber(existente.cantidad_asignada) + cantidad;
        herramientaMap.set(idHerramienta, {
          ...existente,
          cantidad_asignada: cantidadAsignada,
          en_obra: Math.max(
            cantidadAsignada -
              this.toNumber(existente.cantidad_devuelta) -
              this.toNumber(existente.cantidad_danada) -
              this.toNumber(existente.cantidad_perdida),
            0,
          ),
        });
      } else {
        herramientaMap.set(idHerramienta, {
          id_herramienta: idHerramienta,
          nombre_herramienta: item.nombre,
          cantidad_asignada: cantidad,
          cantidad_devuelta: 0,
          cantidad_danada: 0,
          cantidad_perdida: 0,
          en_obra: cantidad,
        });
      }
    }

    const updatedHerramientas = Array.from(herramientaMap.values());

    this.toolDetail.set({
      nombre_obra: currentDetail?.nombre_obra ?? this.detailSafe().nombreObra,
      herramientas: updatedHerramientas,
    });

    this.closeToolCatalog();
  }

  setToolQuantity(idHerramienta: number, value: unknown): void {
    const detail = this.toolDetail();

    if (!detail) {
      return;
    }

    const nextCantidad = Math.max(this.toNumber(value), 0);
    const updated = detail.herramientas.map((herramienta) => {
      if (this.toNumber(herramienta.id_herramienta) !== this.toNumber(idHerramienta)) {
        return herramienta;
      }

      const enObra = Math.max(
        nextCantidad -
          this.toNumber(herramienta.cantidad_devuelta) -
          this.toNumber(herramienta.cantidad_danada) -
          this.toNumber(herramienta.cantidad_perdida),
        0,
      );

      return {
        ...herramienta,
        cantidad_asignada: nextCantidad,
        en_obra: enObra,
      };
    });

    this.toolDetail.set({
      ...detail,
      herramientas: updated,
    });
    this.editingToolId.set(this.toNumber(idHerramienta));
  }

  toggleEditingTool(idHerramienta: number): void {
    const normalizedId = this.toNumber(idHerramienta);
    this.editingToolId.set(this.editingToolId() === normalizedId ? 0 : normalizedId);
  }

  removeToolFromDetail(idHerramienta: number): void {
    const detail = this.toolDetail();

    if (!detail) {
      return;
    }

    const normalizedId = this.toNumber(idHerramienta);
    const updated = detail.herramientas.filter(
      (herramienta) => this.toNumber(herramienta.id_herramienta) !== normalizedId,
    );

    this.toolDetail.set({
      ...detail,
      herramientas: updated,
    });

    if (this.editingToolId() === normalizedId) {
      this.editingToolId.set(0);
    }
  }

  saveToolChanges(): void {
    const idObra = this.currentObraId();
    const detail = this.toolDetail();

    if (idObra <= 0 || !detail || this.isSavingTool() || !this.toolHasChanges()) {
      return;
    }

    this.isSavingTool.set(true);
    this.toolSaveError.set(null);
    this.toolSaveSuccess.set(null);

    const herramientas = (detail.herramientas ?? [])
      .map((herramienta) => ({
        id_herramienta: this.toNumber(herramienta.id_herramienta),
        cantidad_asignada: this.toNumber(herramienta.cantidad_asignada),
      }))
      .filter((herramienta) => herramienta.id_herramienta > 0 && herramienta.cantidad_asignada > 0);

    const payload: ObraHerramientaSyncPayload = {
      id_obra: idObra,
      herramientas,
    };

    this.obraService
      .syncObraHerramientas(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingTool.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.toolDetail.set(response.data ?? null);
          this.toolSaveError.set(null);

          if (response.data) {
            this.toolBaselineKey.set(this.serializeTools(response.data.herramientas ?? []));
            const successMessage =
              this.toText(response.message) || 'Herramientas sincronizadas correctamente.';
            this.toolSaveSuccess.set(successMessage);
            window.alert(successMessage);
            this.clearToolSaveSuccessLater();
          }
        },
        error: () => {
          this.toolSaveError.set('No se pudieron guardar los cambios de herramientas.');
        },
      });
  }

  confirmAndDeleteDebtPayment(pago: ObraDeudaPago): void {
    const idObraPago = this.toNumber(pago.id_obra_pago);

    if (idObraPago <= 0) {
      return;
    }

    if (!confirm('¿Confirmar eliminación del pago? Esta acción no se puede deshacer.')) {
      return;
    }

    this.deleteDebtPayment(idObraPago);
  }

  deleteDebtPayment(id_obra_pago: number): void {
    const idObra = this.currentObraId();

    if (this.isDeletingDebtPayment() || idObra <= 0 || id_obra_pago <= 0) {
      return;
    }

    this.isDeletingDebtPayment.set(true);
    this.debtPaymentsError.set(null);

    this.obraService
      .deleteObraPago(id_obra_pago)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDeletingDebtPayment.set(false)),
      )
      .subscribe({
        next: () => {
          this.selectedDebtPaymentId.set(0);
          this.loadDebtPayments();
        },
        error: () => {
          this.debtPaymentsError.set('No se pudo eliminar el pago seleccionado.');
        },
      });
  }

  cancelPersonalMovementEdit(): void {
    this.selectedPersonalMovementId.set(0);
    this.movementForm.set({
      tipo: 'adelanto',
      monto: '',
      descripcion: '',
      fecha: this.getTodayIsoDate(),
    });
  }

  getPersonalDebt(idUsuario: number): number {
    const normalizedId = this.toNumber(idUsuario);

    const selected = this.personalPayments()?.personales.find(
      (personal) => this.toNumber(personal.id_usuario) === normalizedId,
    );

    if (selected) {
      return this.toNumber(selected.saldo_pendiente);
    }

    const detail = this.detail();
    const worker = detail?.personales.find(
      (personal) => this.toNumber(personal.id_usuario) === normalizedId,
    );

    return worker ? Math.max(this.toNumber(worker.pago_acordado), 0) : 0;
  }

  canSavePersonalMovement(): boolean {
    const selected = this.selectedPersonalPayment();
    const form = this.movementForm();
    const monto = this.toNumber(form.monto);

    return !!selected && monto > 0 && this.toText(form.fecha).length > 0;
  }

  setMovementType(tipo: PersonalMovimientoFormState['tipo']): void {
    this.movementForm.update((current) => ({
      ...current,
      tipo,
    }));
  }

  setMovementAmount(value: unknown): void {
    this.movementForm.update((current) => ({
      ...current,
      monto: this.toText(value),
    }));
  }

  setMovementDescription(value: unknown): void {
    this.movementForm.update((current) => ({
      ...current,
      descripcion: this.toText(value),
    }));
  }

  setMovementDate(value: unknown): void {
    this.movementForm.update((current) => ({
      ...current,
      fecha: this.toText(value),
    }));
  }

  savePersonalMovement(): void {
    const idObra = this.currentObraId();
    const idUsuario = this.selectedPersonalPaymentUserId();
    const selected = this.selectedPersonalPayment();
    const form = this.movementForm();
    const idMovimiento = this.selectedPersonalMovementId();

    if (
      idObra <= 0 ||
      idUsuario <= 0 ||
      !selected ||
      !this.canSavePersonalMovement() ||
      this.isSavingPersonal()
    ) {
      return;
    }

    const payload: ObraPersonalPagoPayload = {
      id_obra: idObra,
      id_usuario: idUsuario,
      tipo: form.tipo,
      descripcion: this.toText(form.descripcion),
      fecha: this.toText(form.fecha),
      monto: this.toNumber(form.monto),
    };

    this.isSavingPersonal.set(true);

    const request$ =
      idMovimiento > 0
        ? this.obraService.updateObraPersonalPago({
            id_movimiento: idMovimiento,
            ...payload,
          })
        : this.obraService.createObraPersonalPago(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingPersonal.set(false)),
      )
      .subscribe({
        next: () => {
          this.personalPaymentsError.set(null);
          this.cancelPersonalMovementEdit();
          this.loadPersonalPayments(idUsuario);
        },
        error: () => {
          this.personalPaymentsError.set(
            idMovimiento > 0
              ? 'No se pudo actualizar el movimiento del trabajador.'
              : 'No se pudo registrar el movimiento del trabajador.',
          );
        },
      });
  }

  confirmAndDeletePersonalMovement(): void {
    const idMovimiento = this.selectedPersonalMovementId();

    if (idMovimiento <= 0) {
      return;
    }

    // Simple confirmation; can be replaced by a modal later
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Confirmar eliminación del movimiento? Esta acción no se puede deshacer.')) {
      return;
    }

    this.deletePersonalMovement(idMovimiento);
  }

  deletePersonalMovement(id_movimiento: number): void {
    const idObra = this.currentObraId();
    const idUsuario = this.selectedPersonalPaymentUserId();

    if (this.isSavingPersonal() || id_movimiento <= 0 || idObra <= 0 || idUsuario <= 0) {
      return;
    }

    this.isSavingPersonal.set(true);

    this.obraService
      .deleteObraPersonalPago(id_movimiento)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingPersonal.set(false)),
      )
      .subscribe({
        next: () => {
          this.personalPaymentsError.set(null);
          this.cancelPersonalMovementEdit();
          // reload payments for the current worker
          this.loadPersonalPayments(idUsuario);
        },
        error: () => {
          this.personalPaymentsError.set('No se pudo eliminar el movimiento del trabajador.');
        },
      });
  }

  isMarkedForRemoval(idUsuario: number): boolean {
    return Object.prototype.hasOwnProperty.call(
      this.pendingRemovedUserIds(),
      this.toNumber(idUsuario),
    );
  }

  toggleRemoval(personal: ObraDetallePersonal): void {
    const idUsuario = this.toNumber(personal.id_usuario);

    if (idUsuario <= 0) {
      return;
    }

    this.pendingRemovedUserIds.update((current) => {
      const next = { ...current };

      if (Object.prototype.hasOwnProperty.call(next, idUsuario)) {
        delete next[idUsuario];
      } else {
        next[idUsuario] = true;
      }
      return next;
    });
  }

  clearPendingRemovals(): void {
    this.pendingRemovedUserIds.set({});
  }

  savePersonnelChanges(): void {
    const idObra = this.currentObraId();
    const currentDetail = this.detail();

    if (idObra <= 0 || this.isSavingPersonal() || !currentDetail) {
      return;
    }

    const removedIds = new Set(
      Object.keys(this.pendingRemovedUserIds())
        .map((idUsuario) => this.toNumber(idUsuario))
        .filter((idUsuario) => idUsuario > 0),
    );

    const remainingPersonales = currentDetail.personales
      .filter((personal) => !removedIds.has(this.toNumber(personal.id_usuario)))
      .map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(personal.pago_acordado),
      }));

    this.syncPersonalAssignments(
      idObra,
      remainingPersonales,
      'No se pudo actualizar el personal de la obra.',
    );
  }

  handlePersonalSelection(payload: ObraPersonalSyncPayload): void {
    const idObra = this.currentObraId();
    const currentDetail = this.detail();

    if (idObra <= 0 || this.isSavingPersonal() || !currentDetail) {
      return;
    }

    const removedIds = new Set(
      Object.keys(this.pendingRemovedUserIds())
        .map((idUsuario) => this.toNumber(idUsuario))
        .filter((idUsuario) => idUsuario > 0),
    );

    const personalesExistentes = currentDetail.personales
      .filter((personal) => !removedIds.has(this.toNumber(personal.id_usuario)))
      .map((personal) => ({
        id_usuario: this.toNumber(personal.id_usuario),
        pago_acordado: this.toNumber(personal.pago_acordado),
      }));

    const personalesNuevos = payload.personales.map((personal) => ({
      id_usuario: this.toNumber(personal.id_usuario),
      pago_acordado: this.toNumber(personal.pago_acordado),
    }));

    const mergedPersonalesMap = new Map<number, ObraPersonalPayload>();

    for (const personal of personalesExistentes) {
      if (personal.id_usuario > 0) {
        mergedPersonalesMap.set(personal.id_usuario, personal);
      }
    }

    for (const personal of personalesNuevos) {
      if (personal.id_usuario > 0) {
        mergedPersonalesMap.set(personal.id_usuario, personal);
      }
    }

    this.syncPersonalAssignments(
      idObra,
      Array.from(mergedPersonalesMap.values()),
      'No se pudo asignar el personal a la obra.',
    );
  }

  private syncPersonalAssignments(
    idObra: number,
    personales: ObraPersonalPayload[],
    errorMessage: string,
  ): void {
    this.isSavingPersonal.set(true);

    this.obraService
      .syncObraPersonal({
        id_obra: idObra,
        personales,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingPersonal.set(false)),
      )
      .subscribe({
        next: () => {
          this.isPersonalModalOpen.set(false);
          this.clearPendingRemovals();
          this.loadDetail(idObra);
        },
        error: () => {
          this.error.set(errorMessage);
        },
      });
  }

  private ensurePersonalPaymentsSelection(): void {
    if (this.activeTab() !== 'personal') {
      return;
    }

    const detail = this.detail();

    if (!detail || detail.personales.length === 0) {
      this.personalPayments.set(null);
      this.selectedPersonalPaymentUserId.set(0);
      return;
    }

    const currentSelected = this.selectedPersonalPaymentUserId();
    const stillExists = detail.personales.some(
      (personal) => this.toNumber(personal.id_usuario) === currentSelected,
    );
    const nextSelected =
      stillExists && currentSelected > 0
        ? currentSelected
        : this.toNumber(detail.personales[0].id_usuario);

    if (nextSelected > 0) {
      this.selectedPersonalPaymentUserId.set(nextSelected);
    }

    if (!this.personalPayments() && nextSelected > 0) {
      this.loadPersonalPayments(nextSelected);
    }
  }

  private loadPersonalPayments(idUsuario: number): void {
    const idObra = this.currentObraId();
    const normalizedId = this.toNumber(idUsuario);

    if (idObra <= 0 || normalizedId <= 0) {
      return;
    }

    this.personalPaymentsLoading.set(true);
    this.personalPaymentsError.set(null);

    this.obraService
      .getObraDetallePersonalPagos(idObra, normalizedId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.personalPaymentsLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.personalPayments.set(response.data ?? null);
        },
        error: () => {
          this.personalPayments.set(null);
          this.personalPaymentsError.set('No se pudieron cargar los pagos del trabajador.');
        },
      });
  }

  private loadDetail(idObra: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.obraService
      .getObraDetalle(idObra)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const data = response.data;

          if (!data) {
            this.error.set('La obra no devolvio informacion de detalle.');
            this.detail.set(null);
            return;
          }

          this.detail.set(this.toViewModel(idObra, data));

          if (this.activeTab() === 'personal') {
            this.ensurePersonalPaymentsSelection();
          }

          if (this.activeTab() === 'pagos') {
            this.loadDebtPayments();
          }

          if (this.activeTab() === 'material') {
            this.loadMaterialDetail();
          }

          if (this.activeTab() === 'herramientas') {
            this.loadToolDetail();
          }
        },
        error: () => {
          this.error.set('No se pudo cargar el detalle de la obra.');
          this.detail.set(null);
        },
      });
  }

  private loadMaterialDetail(): void {
    const idObra = this.currentObraId();

    if (idObra <= 0) {
      return;
    }

    this.materialLoading.set(true);
    this.materialError.set(null);

    this.obraService
      .getObraDetalleMaterial(idObra)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.materialLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const detail = response.data ?? null;
          this.materialDetail.set(detail);

          if (detail) {
            this.hydrateMaterialFinalizeSelection(detail);
            const subtotal = this.toNumber(detail.precio_materiales);
            const fallback = this.calculateMaterialSubtotal(detail.materiales ?? []);
            const subtotalFinal = subtotal > 0 ? subtotal : fallback;
            const manoObra = this.toNumber(detail.precio_mano_obra);
            const totalSugerido = subtotalFinal + manoObra;
            const totalAcordadoApi = this.toNumber(detail.precio_total);

            if (totalAcordadoApi > 0 && !this.isSameMoney(totalAcordadoApi, totalSugerido)) {
              this.materialTotalAcordadoManual.set(true);
              this.materialTotalAcordado.set(totalAcordadoApi);
            } else {
              this.materialTotalAcordadoManual.set(false);
              this.materialTotalAcordado.set(totalSugerido);
            }

            this.materialBaselineKey.set(this.serializeMaterials(detail.materiales ?? []));
            const currentFinalizePayload = this.buildMaterialFinalizePayload();
            this.materialFinalizeBaselineKey.set(
              currentFinalizePayload ? this.serializeFinalizeMaterials(currentFinalizePayload) : '',
            );
          } else {
            this.materialTotalAcordado.set(0);
            this.materialTotalAcordadoManual.set(false);
            this.materialBaselineKey.set('');
            this.materialFinalizeBaselineKey.set('');
          }
        },
        error: () => {
          this.materialDetail.set(null);
          this.materialError.set('No se pudo cargar el detalle de materiales.');
        },
      });
  }

  private loadToolDetail(): void {
    const idObra = this.currentObraId();

    if (idObra <= 0) {
      return;
    }

    this.toolLoading.set(true);
    this.toolError.set(null);

    this.obraService
      .getObraDetalleHerramienta(idObra)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.toolLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const detail = response.data ?? null;
          this.toolDetail.set(detail);

          if (detail) {
            this.hydrateToolFinalizeSelection(detail);
            this.toolBaselineKey.set(this.serializeTools(detail.herramientas ?? []));
            const finalizePayload = this.buildToolFinalizePayload();
            this.toolFinalizeBaselineKey.set(
              finalizePayload ? this.serializeFinalizeTools(finalizePayload) : '',
            );
            this.editingToolId.set(0);
          } else {
            this.toolBaselineKey.set('');
            this.toolFinalizeBaselineKey.set('');
            this.toolFinalizeSelection.set({});
          }
        },
        error: () => {
          this.toolDetail.set(null);
          this.toolError.set('No se pudo cargar el detalle de herramientas.');
        },
      });
  }

  private loadToolCatalog(forceReload = false): void {
    const idSucursal = this.toNumber(this.sucursalService.selectedSucursalId());

    if (idSucursal <= 0) {
      this.toolCatalogLoading.set(false);
      this.toolCatalogItems.set([]);
      this.toolCatalogError.set('Selecciona una sucursal para cargar las herramientas.');
      return;
    }

    if (
      !forceReload &&
      this.toolCatalogSucursalId() === idSucursal &&
      this.toolCatalogItems().length > 0
    ) {
      return;
    }

    this.toolCatalogLoading.set(true);
    this.toolCatalogError.set(null);

    this.obraService
      .getObraHerramientas(idSucursal)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.toolCatalogLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.toolCatalogItems.set(response.data ?? []);
          this.toolCatalogSucursalId.set(idSucursal);
        },
        error: () => {
          this.toolCatalogItems.set([]);
          this.toolCatalogError.set('No se pudo cargar el inventario de herramientas.');
        },
      });
  }

  private loadMaterialCatalog(forceReload = false): void {
    const idSucursal = this.toNumber(this.sucursalService.selectedSucursalId());

    if (idSucursal <= 0) {
      this.materialCatalogLoading.set(false);
      this.materialCatalogItems.set([]);
      this.materialCatalogError.set('Selecciona una sucursal para cargar el inventario.');
      return;
    }

    if (
      !forceReload &&
      this.materialCatalogSucursalId() === idSucursal &&
      this.materialCatalogItems().length > 0
    ) {
      return;
    }

    this.materialCatalogLoading.set(true);
    this.materialCatalogError.set(null);

    this.obraService
      .getObraMateriales(idSucursal)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.materialCatalogLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.materialCatalogItems.set(response.data ?? []);
          this.materialCatalogSucursalId.set(idSucursal);
        },
        error: () => {
          this.materialCatalogItems.set([]);
          this.materialCatalogError.set('No se pudo cargar el inventario de materiales.');
        },
      });
  }

  private loadDebtPayments(): void {
    const idObra = this.currentObraId();

    if (idObra <= 0) {
      return;
    }

    this.debtPaymentsLoading.set(true);
    this.debtPaymentsError.set(null);

    this.obraService
      .getObraDetalleDeuda(idObra)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.debtPaymentsLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.debtPayments.set(response.data ?? null);
        },
        error: () => {
          this.debtPayments.set(null);
          this.debtPaymentsError.set('No se pudo cargar el submodulo de pagos.');
        },
      });
  }

  private toViewModel(idObra: number, data: ObraDetalle): ObraDetailViewModel {
    const fechaInicio = this.formatDate(data.fecha_inicio);
    const fechaFin = this.formatDate(data.fecha_fin);
    const progreso = this.calculateProgress(data.fecha_inicio, data.fecha_fin);
    const statusLabel = progreso >= 100 ? 'Completada' : 'En Progreso';
    const deadlineLabel = this.buildDeadlineLabel(data.fecha_fin);
    const precioTotal = this.toNumber(data.precio_total);
    const saldo = this.toNumber(data.saldo);
    const pagado = Math.max(precioTotal - saldo, 0);
    const pagadoPorcentaje =
      precioTotal > 0 ? Math.max(0, Math.min(100, Math.round((pagado / precioTotal) * 100))) : 0;
    const pendientePorcentaje =
      precioTotal > 0 ? Math.max(0, Math.min(100, Math.round((saldo / precioTotal) * 100))) : 0;

    return {
      idObra,
      projectIdLabel: `Project ID: OB-${String(idObra).padStart(4, '0')}`,
      statusLabel,
      deadlineLabel,
      progreso,
      nombreObra: this.toText(data.nombre_obra),
      ubicacion: this.toText(data.ubicacion),
      nombreCliente: this.toText(data.nombre_cliente),
      fechaInicio,
      fechaFin,
      precioTotal,
      saldo,
      pagado,
      pendiente: Math.max(saldo, 0),
      pagadoPorcentaje,
      pendientePorcentaje,
      personales: data.personales ?? [],
    };
  }

  private calculateProgress(fechaInicio: string, fechaFin: string): number {
    const inicioKey = this.dateKey(fechaInicio);
    const finKey = this.dateKey(fechaFin);
    const hoyKey = this.getTodayKey();

    if (inicioKey <= 0 || finKey <= 0 || finKey <= inicioKey) {
      return 0;
    }

    if (hoyKey <= inicioKey) {
      return 0;
    }

    if (hoyKey >= finKey) {
      return 100;
    }

    return Math.max(
      0,
      Math.min(100, Math.round(((hoyKey - inicioKey) / (finKey - inicioKey)) * 100)),
    );
  }

  private buildDeadlineLabel(fechaFin: string): string {
    const days = this.calculateDaysRemaining(fechaFin);

    if (days < 0) {
      return `Vencida hace ${Math.abs(days)} dias`;
    }

    if (days === 0) {
      return 'Vence hoy';
    }

    if (days === 1) {
      return '1 dia restante';
    }

    return `${days} dias restantes`;
  }

  private calculateDaysRemaining(fechaFin: string): number {
    const finKey = this.dateKey(fechaFin);
    const hoyKey = this.getTodayKey();

    if (finKey <= 0) {
      return 0;
    }

    return Math.ceil((finKey - hoyKey) / 86_400_000);
  }

  formatDate(value: string): string {
    const normalized = this.toText(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);

    if (!match) {
      return normalized || '-';
    }

    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  private dateKey(value: string): number {
    const normalized = this.toText(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

    if (!match) {
      return 0;
    }

    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private getTodayIsoDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private getTodayKey(): number {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return this.dateKey(formatter.format(new Date()));
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      maximumFractionDigits: 2,
    }).format(value);
  }

  getMaterialSubtotal(cantidad: number, precio: number): number {
    return Math.max(this.toNumber(cantidad) * this.toNumber(precio), 0);
  }

  formatQuotaLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  isDebtPagoPaid(pago: ObraDeudaPago): boolean {
    return this.toBooleanLike(pago.estado);
  }

  trackTab(_: number, tab: { id: ObraDetailTab; label: string }): ObraDetailTab {
    return tab.id;
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeSearchText(value: unknown): string {
    return this.toText(value).toLowerCase();
  }

  private calculateMaterialSubtotal(
    materiales: Array<{ cantidad_usada: number; precio: number }>,
  ): number {
    return materiales.reduce(
      (total, material) =>
        total + this.getMaterialSubtotal(material.cantidad_usada, material.precio),
      0,
    );
  }

  private serializeMaterials(
    materiales: Array<{
      id_material: number;
      cantidad_usada: number;
      precio: number;
      costo: number;
    }>,
  ): string {
    return [...materiales]
      .map((material) => ({
        id: this.toNumber(material.id_material),
        cantidad: this.toNumber(material.cantidad_usada),
        precio: this.toNumber(material.precio),
        costo: this.toNumber(material.costo),
      }))
      .sort((a, b) => a.id - b.id)
      .map((material) => `${material.id}:${material.cantidad}:${material.precio}:${material.costo}`)
      .join('|');
  }

  private serializeTools(
    herramientas: Array<{ id_herramienta: number; cantidad_asignada: number }>,
  ): string {
    return [...herramientas]
      .map((herramienta) => ({
        id: this.toNumber(herramienta.id_herramienta),
        cantidad: this.toNumber(herramienta.cantidad_asignada),
      }))
      .sort((a, b) => a.id - b.id)
      .map((herramienta) => `${herramienta.id}:${herramienta.cantidad}`)
      .join('|');
  }

  private clearToolSaveSuccessLater(): void {
    setTimeout(() => {
      this.toolSaveSuccess.set(null);
    }, 2500);
  }

  private syncMaterialTotalAcordado(totalSugerido: number): void {
    if (!this.materialTotalAcordadoManual()) {
      this.materialTotalAcordado.set(totalSugerido);
    }
  }

  private isSameMoney(left: number, right: number): boolean {
    return Math.abs(this.toNumber(left) - this.toNumber(right)) < 0.01;
  }

  private clearMaterialSaveSuccessLater(): void {
    setTimeout(() => {
      this.materialSaveSuccess.set(null);
    }, 2500);
  }

  private toBooleanLike(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = this.toText(value).toLowerCase();

    return ['1', 'true', 'si', 'sí', 'yes'].includes(normalized);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
