import {
  Component,
  inject,
  OnInit,
  signal,
  AfterViewInit,
  OnDestroy,
  effect,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

import { DashboardService } from './dashboard.service';
import { DashboardData } from './dashboard.interfaces';
import { SucursalService } from '../shared/sucursal/sucursal.service';
import { Sucursal } from '../shared/sucursal/sucursal.interfaces';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly sucursalService = inject(SucursalService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('obrasProfitChart') private obrasProfitChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ingresosMaterialesChart')
  private ingresosMaterialesChartRef?: ElementRef<HTMLCanvasElement>;

  dashboardData = signal<DashboardData | null>(null);
  sucursales = signal<(Sucursal & { id_sucursal: 0 | number })[]>([]);
  loading = signal(false);

  filtersForm: FormGroup;

  private obrasProfitChart: Chart | null = null;
  private ingresosMaterialesChart: Chart | null = null;

  constructor() {
    this.filtersForm = this.fb.group({
      id_sucursal: [0],
      fecha_inicio: [''],
      fecha_fin: [''],
    });

    effect(() => {
      this.sucursales.set([
        { id_sucursal: 0, nombre: 'Todas las Sucursales' },
        ...this.sucursalService.sucursales(),
      ]);
    });
  }

  ngOnInit(): void {
    this.sucursalService.loadSucursales().subscribe({
      error: (error: unknown) => {
        console.error('Error loading sucursales:', error);
      },
    });
    this.loadDashboardData();

    this.filtersForm.valueChanges.subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.initCharts();
      this.updateCharts();
    });
  }

  ngOnDestroy(): void {
    if (this.obrasProfitChart) {
      this.obrasProfitChart.destroy();
    }
    if (this.ingresosMaterialesChart) {
      this.ingresosMaterialesChart.destroy();
    }
  }

  private initCharts(): void {
    const canvas = this.obrasProfitChartRef?.nativeElement;

    if (canvas && !this.obrasProfitChart) {
      this.obrasProfitChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Personal (Acordado)',
              data: [],
              backgroundColor: '#f59e0b',
              stack: 'obra',
            },
            {
              label: 'Material (Costo)',
              data: [],
              backgroundColor: '#ef4444',
              stack: 'obra',
            },
            {
              label: 'Utilidad',
              data: [],
              backgroundColor: '#10b981',
              stack: 'obra',
            },
            {
              type: 'line',
              label: 'Precio Total',
              data: [],
              borderColor: '#2563eb',
              backgroundColor: '#2563eb',
              pointRadius: 3,
              pointHoverRadius: 4,
              borderWidth: 2,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                afterBody: (items) => {
                  const idx = items[0]?.dataIndex ?? -1;
                  const obra = this.dashboardData()?.obras_grafico?.[idx];
                  if (!obra) {
                    return '';
                  }
                  const utilidad = obra.utilidad_estimada;
                  const label = utilidad >= 0 ? 'Utilidad estimada' : 'Pérdida estimada';
                  return [
                    `Precio total: ${obra.precio_total.toFixed(2)} Bs`,
                    `Costo total: ${obra.costo_total.toFixed(2)} Bs`,
                    `${label}: ${Math.abs(utilidad).toFixed(2)} Bs`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: {
                maxRotation: 0,
                autoSkip: false,
              },
            },
            y: {
              stacked: true,
            },
          },
        },
      });
    }

    const ingresosCanvas = this.ingresosMaterialesChartRef?.nativeElement;

    if (ingresosCanvas && !this.ingresosMaterialesChart) {
      this.ingresosMaterialesChart = new Chart(ingresosCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Ventas', 'Obras'],
          datasets: [
            {
              data: [0, 0],
              backgroundColor: ['#2563eb', '#10b981'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const label = ctx.label ?? '';
                  const value = Number(ctx.parsed) || 0;
                  return `${label}: ${value.toFixed(2)}%`;
                },
              },
            },
          },
        },
      });
    }

    this.updateCharts();
  }

  private updateCharts(): void {
    const data = this.dashboardData();
    if (!data) {
      return;
    }

    if (this.obrasProfitChart) {
      const labels = (data.obras_grafico ?? []).map((o) => o.nombre_obra);
      const precios = (data.obras_grafico ?? []).map((o) => Number(o.precio_total) || 0);
      const personal = (data.obras_grafico ?? []).map(
        (o) => Number(o.series?.personal ?? o.total_personal_acordado) || 0,
      );
      const material = (data.obras_grafico ?? []).map(
        (o) => Number(o.series?.material ?? o.total_material) || 0,
      );
      const utilidad = (data.obras_grafico ?? []).map(
        (o) => Number(o.series?.utilidad ?? Math.max(Number(o.utilidad_estimada) || 0, 0)) || 0,
      );

      this.obrasProfitChart.data.labels = labels;
      this.obrasProfitChart.data.datasets[0].data = personal;
      this.obrasProfitChart.data.datasets[1].data = material;
      this.obrasProfitChart.data.datasets[2].data = utilidad;
      this.obrasProfitChart.data.datasets[3].data = precios;
      this.obrasProfitChart.resize();
      this.obrasProfitChart.update();
    }

    if (this.ingresosMaterialesChart) {
      const dist = data.distribucion_ingresos_materiales;
      const ventasPct = Number(dist?.ventas_pct) || 0;
      const obrasPct = Number(dist?.obras_pct) || 0;

      this.ingresosMaterialesChart.data.datasets[0].data = [ventasPct, obrasPct];
      this.ingresosMaterialesChart.resize();
      this.ingresosMaterialesChart.update();
    }
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/La_Paz',
    }).format(parsed);
  }

  buildWhatsAppUrl(numCel: string): string {
    const digits = String(numCel ?? '').replace(/\D+/g, '');

    if (!digits) {
      return '#';
    }

    const normalized = digits.startsWith('591') ? digits : `591${digits.replace(/^0+/, '')}`;

    return `https://wa.me/${normalized}`;
  }

  contactar(numCel: string): void {
    const url = this.buildWhatsAppUrl(numCel);

    if (url === '#') {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getSucursalNombre(idSucursal: number): string {
    const normalizedId = Number(idSucursal) || 0;
    const sucursal = this.sucursales().find((item) => item.id_sucursal === normalizedId);

    return sucursal?.nombre ?? 'Sucursal no disponible';
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    const values = this.filtersForm.value;
    this.dashboardService
      .getDashboardData(values.id_sucursal, values.fecha_inicio, values.fecha_fin)
      .subscribe({
        next: (response) => {
          this.dashboardData.set(response.data);
          this.loading.set(false);
          this.updateCharts();
        },
        error: (error: unknown) => {
          console.error('Error loading dashboard:', error);
          this.loading.set(false);
        },
      });
  }
}
