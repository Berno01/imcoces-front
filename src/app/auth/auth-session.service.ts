import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AuthSession,
  AuthTokenData,
  AuthUser,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
} from './auth.interfaces';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private static readonly SESSION_STORAGE_KEY = 'imcoces.auth.session.v1';
  private static readonly REFRESH_AHEAD_MS = 120000;
  private static readonly MIN_REFRESH_DELAY_MS = 250;

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly loginLoadingState = signal(false);
  private readonly refreshLoadingState = signal(false);
  private readonly logoutLoadingState = signal(false);

  private refreshInFlight$?: Observable<AuthTokenData>;
  private proactiveRefreshTimer?: ReturnType<typeof setTimeout>;

  readonly session = computed(() => this.sessionState());
  readonly session$ = toObservable(this.sessionState);
  readonly isAuthenticated = computed(() => this.hasValidSession());
  readonly usuario = computed(() => this.sessionState()?.usuario ?? null);
  readonly idRol = computed(() => this.sessionState()?.usuario.id_rol ?? null);
  readonly tokenExpiration = computed(() => this.sessionState()?.expires_at ?? null);
  readonly isLoginLoading = computed(() => this.loginLoadingState());
  readonly isRefreshLoading = computed(() => this.refreshLoadingState());
  readonly isLogoutLoading = computed(() => this.logoutLoadingState());
  readonly isRefreshInFlight = computed(() => this.refreshInFlight$ !== undefined);

  constructor() {
    this.hydrateFromStorage();

    if (this.hasValidSession()) {
      this.scheduleProactiveRefresh();
    }
  }

  bootstrapSession(): Observable<void> {
    if (!this.hasValidSession()) {
      this.clearSession();
      return of(void 0);
    }

    return this.me().pipe(
      map(() => void 0),
      catchError(() => {
        this.clearSession();
        return of(void 0);
      }),
    );
  }

  login(payload: LoginRequest): Observable<AuthSession> {
    this.loginLoadingState.set(true);

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      map((response) => {
        const tokenData = response.data?.token;
        const usuario = response.data?.usuario;

        if (!tokenData || !usuario) {
          throw new Error('Respuesta de login invalida.');
        }

        const session = this.buildSession(tokenData, usuario);
        this.setSession(session);
        return session;
      }),
      finalize(() => this.loginLoadingState.set(false)),
    );
  }

  me(): Observable<AuthUser> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`).pipe(
      map((response) => response.data),
      tap((usuario) => {
        const current = this.sessionState();
        if (!current) {
          return;
        }

        this.setSession({
          ...current,
          usuario,
        });
      }),
    );
  }

  refreshToken(): Observable<AuthTokenData> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const current = this.sessionState();
    if (!current) {
      return throwError(() => new Error('No hay sesion activa para refrescar token.'));
    }

    this.refreshLoadingState.set(true);

    const request$ = this.http.post<RefreshResponse>(`${this.baseUrl}/refresh`, {}).pipe(
      map((response) => response.data),
      tap((tokenData) => {
        const activeSession = this.sessionState();
        if (!activeSession) {
          return;
        }

        this.setSession(this.buildSession(tokenData, activeSession.usuario));
      }),
      finalize(() => {
        this.refreshInFlight$ = undefined;
        this.refreshLoadingState.set(false);
      }),
      shareReplay(1),
    );

    this.refreshInFlight$ = request$;
    return request$;
  }

  logout(): Observable<void> {
    this.logoutLoadingState.set(true);

    if (!this.sessionState()) {
      this.clearSession();
      this.logoutLoadingState.set(false);
      return of(void 0);
    }

    return this.http.post<LogoutResponse>(`${this.baseUrl}/logout`, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.clearSession()),
      finalize(() => this.logoutLoadingState.set(false)),
    );
  }

  logoutLocal(): void {
    this.clearSession();
  }

  waitForRefreshLock(): Observable<void> {
    if (!this.refreshInFlight$) {
      return of(void 0);
    }

    return this.refreshInFlight$.pipe(map(() => void 0));
  }

  hasValidSession(): boolean {
    const session = this.sessionState();
    if (!session) {
      return false;
    }

    if (!session.access_token || !session.token_type) {
      return false;
    }

    return session.expires_at > Date.now();
  }

  getAuthorizationHeader(): string | null {
    const session = this.sessionState();
    if (!session || !this.hasValidSession()) {
      return null;
    }

    return `${session.token_type} ${session.access_token}`;
  }

  private setSession(session: AuthSession): void {
    this.sessionState.set(session);
    this.writeSessionToStorage(session);
    this.scheduleProactiveRefresh();
  }

  private clearSession(): void {
    this.clearProactiveRefreshTimer();

    this.sessionState.set(null);
    this.refreshInFlight$ = undefined;
    this.removeSessionFromStorage();
  }

  private buildSession(tokenData: AuthTokenData, usuario: AuthUser): AuthSession {
    const expiresIn = this.toNumber(tokenData.expires_in);

    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: expiresIn,
      expires_at: Date.now() + expiresIn * 1000,
      usuario,
    };
  }

  private hydrateFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(AuthSessionService.SESSION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;

      if (!parsed || typeof parsed !== 'object') {
        this.removeSessionFromStorage();
        return;
      }

      const accessToken = typeof parsed.access_token === 'string' ? parsed.access_token : '';
      const tokenType = typeof parsed.token_type === 'string' ? parsed.token_type : 'Bearer';
      const expiresIn = this.toNumber(parsed.expires_in);
      const expiresAt = this.toNumber(parsed.expires_at);
      const usuario = this.normalizeUser(parsed.usuario);

      if (!accessToken || !usuario || expiresIn <= 0 || expiresAt <= Date.now()) {
        this.removeSessionFromStorage();
        return;
      }

      this.sessionState.set({
        access_token: accessToken,
        token_type: tokenType,
        expires_in: expiresIn,
        expires_at: expiresAt,
        usuario,
      });

      this.scheduleProactiveRefresh();
    } catch {
      this.removeSessionFromStorage();
    }
  }

  private scheduleProactiveRefresh(): void {
    this.clearProactiveRefreshTimer();

    const session = this.sessionState();
    if (!session) {
      return;
    }

    if (!this.hasValidSession()) {
      this.clearSession();
      return;
    }

    const refreshAt = session.expires_at - Date.now() - AuthSessionService.REFRESH_AHEAD_MS;
    const delay = Math.max(refreshAt, AuthSessionService.MIN_REFRESH_DELAY_MS);

    this.proactiveRefreshTimer = setTimeout(() => {
      this.executeProactiveRefresh();
    }, delay);
  }

  private clearProactiveRefreshTimer(): void {
    if (!this.proactiveRefreshTimer) {
      return;
    }

    clearTimeout(this.proactiveRefreshTimer);
    this.proactiveRefreshTimer = undefined;
  }

  private executeProactiveRefresh(): void {
    if (!this.hasValidSession()) {
      this.clearSession();
      return;
    }

    this.refreshToken().subscribe({
      next: () => {
        // El refresco exitoso reprograma automaticamente el siguiente ciclo en setSession.
      },
      error: () => {
        this.logoutLocal();
        void this.router.navigateByUrl('/login');
      },
    });
  }

  private normalizeUser(value: unknown): AuthUser | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const idRol = this.toNumber(candidate['id_rol']);

    if (idRol <= 0) {
      return null;
    }

    return {
      ...candidate,
      id_rol: idRol,
      id_usuario: this.toOptionalNumber(candidate['id_usuario']),
      login: this.toOptionalString(candidate['login']),
      nombres: this.toOptionalString(candidate['nombres']),
      apellidos: this.toOptionalString(candidate['apellidos']),
      nombre: this.toOptionalString(candidate['nombre']),
      apellido: this.toOptionalString(candidate['apellido']),
    };
  }

  private writeSessionToStorage(session: AuthSession): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(AuthSessionService.SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private removeSessionFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(AuthSessionService.SESSION_STORAGE_KEY);
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const parsed = this.toNumber(value);
    return parsed > 0 ? parsed : undefined;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
