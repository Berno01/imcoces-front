import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ApiResponse, Sucursal } from './sucursal.interfaces';

@Injectable({
  providedIn: 'root',
})
export class SucursalService {
  private static readonly CACHE_KEY = 'imcoces.sucursales.cache.v1';
  private static readonly SELECTED_CACHE_KEY = 'imcoces.sucursal.selected.v1';

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sucursal`;

  private readonly sucursalesState = signal<Sucursal[]>([]);
  private readonly selectedSucursalIdState = signal<number>(0);
  private readonly loadedState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private inFlightRequest?: Observable<Sucursal[]>;

  readonly sucursales = computed(() => this.sucursalesState());
  readonly selectedSucursalId = computed(() => this.selectedSucursalIdState());
  readonly selectedSucursal = computed(() => {
    const selectedId = this.selectedSucursalIdState();
    if (selectedId <= 0) {
      return null;
    }

    return this.sucursalesState().find((sucursal) => sucursal.id_sucursal === selectedId) ?? null;
  });
  readonly loaded = computed(() => this.loadedState());
  readonly loading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());

  constructor() {
    this.hydrateFromCache();
    this.hydrateSelectedFromCache();
    this.ensureSelectedSucursal();
  }

  loadSucursales(forceReload = false): Observable<Sucursal[]> {
    if (!forceReload && this.loadedState()) {
      return of(this.sucursalesState());
    }

    if (!forceReload && this.inFlightRequest) {
      return this.inFlightRequest;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    const request$ = this.http.get<ApiResponse<Sucursal[]>>(this.baseUrl).pipe(
      map((response) => response.data ?? []),
      tap((sucursales) => {
        this.sucursalesState.set(sucursales);
        this.ensureSelectedSucursal();
        this.loadedState.set(true);
        this.writeCache(sucursales);
      }),
      catchError(() => {
        const cached = this.readCache();

        if (cached.length > 0) {
          this.sucursalesState.set(cached);
          this.ensureSelectedSucursal();
          this.loadedState.set(true);
          return of(cached);
        }

        this.errorState.set('No se pudieron cargar las sucursales.');
        return of([]);
      }),
      finalize(() => {
        this.loadingState.set(false);
        this.inFlightRequest = undefined;
      }),
      shareReplay(1),
    );

    this.inFlightRequest = request$;
    return request$;
  }

  setSelectedSucursal(idSucursal: number): void {
    const parsedId = Number(idSucursal);

    if (!Number.isFinite(parsedId) || parsedId < 0) {
      return;
    }

    if (parsedId === 0) {
      this.selectedSucursalIdState.set(0);
      this.writeSelectedCache(0);
      return;
    }

    const exists = this.sucursalesState().some((sucursal) => sucursal.id_sucursal === parsedId);
    if (!exists) {
      return;
    }

    this.selectedSucursalIdState.set(parsedId);
    this.writeSelectedCache(parsedId);
  }

  private hydrateFromCache(): void {
    const cached = this.readCache();

    if (cached.length > 0) {
      this.sucursalesState.set(cached);
      this.loadedState.set(true);
    }
  }

  private hydrateSelectedFromCache(): void {
    const selectedId = this.readSelectedCache();

    this.selectedSucursalIdState.set(selectedId);
  }

  private ensureSelectedSucursal(): void {
    const sucursales = this.sucursalesState();

    if (sucursales.length === 0) {
      this.selectedSucursalIdState.set(0);
      this.writeSelectedCache(0);
      return;
    }

    const current = this.selectedSucursalIdState();
    if (current === 0) {
      return;
    }

    if (sucursales.some((sucursal) => sucursal.id_sucursal === current)) {
      return;
    }

    this.selectedSucursalIdState.set(0);
    this.writeSelectedCache(0);
  }

  private writeCache(sucursales: Sucursal[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SucursalService.CACHE_KEY, JSON.stringify(sucursales));
  }

  private writeSelectedCache(idSucursal: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SucursalService.SELECTED_CACHE_KEY, String(idSucursal));
  }

  private readSelectedCache(): number {
    if (typeof localStorage === 'undefined') {
      return 0;
    }

    const raw = localStorage.getItem(SucursalService.SELECTED_CACHE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  private readCache(): Sucursal[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(SucursalService.CACHE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const candidate = item as Partial<Sucursal>;

          if (typeof candidate.id_sucursal !== 'number' || typeof candidate.nombre !== 'string') {
            return null;
          }

          return {
            id_sucursal: candidate.id_sucursal,
            nombre: candidate.nombre,
          };
        })
        .filter((item): item is Sucursal => item !== null);
    } catch {
      return [];
    }
  }
}
