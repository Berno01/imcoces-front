import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthSessionService } from './auth-session.service';

const RETRIED_WITH_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const preRequest$ =
    !isLoginRequest(request.url) && !isRefreshRequest(request.url)
      ? authSessionService.waitForRefreshLock()
      : of(void 0);

  return preRequest$.pipe(
    switchMap(() => {
      const requestWithToken = addAuthorizationHeader(
        request,
        authSessionService.getAuthorizationHeader(),
      );
      return next(requestWithToken);
    }),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 403) {
        if (!isLoginRequest(request.url) && !isUnauthorizedRoute(router.url)) {
          void router.navigateByUrl('/no-autorizado');
        }

        return throwError(() => error);
      }

      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isLoginRequest(request.url) || isRefreshRequest(request.url)) {
        authSessionService.logoutLocal();
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }

      if (request.context.get(RETRIED_WITH_REFRESH)) {
        authSessionService.logoutLocal();
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }

      if (!authSessionService.hasValidSession()) {
        authSessionService.logoutLocal();
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }

      return authSessionService.refreshToken().pipe(
        switchMap(() => {
          const refreshedHeader = authSessionService.getAuthorizationHeader();
          const retriedRequest = addAuthorizationHeader(
            request.clone({ context: request.context.set(RETRIED_WITH_REFRESH, true) }),
            refreshedHeader,
          );

          return next(retriedRequest);
        }),
        catchError((refreshError: unknown) => {
          authSessionService.logoutLocal();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function addAuthorizationHeader(
  request: HttpRequest<unknown>,
  authorizationHeader: string | null,
): HttpRequest<unknown> {
  if (!authorizationHeader || isLoginRequest(request.url)) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: authorizationHeader,
    },
  });
}

function isApiRequest(url: string): boolean {
  return normalizeUrl(url).startsWith(normalizeUrl(environment.apiUrl));
}

function isLoginRequest(url: string): boolean {
  return normalizeUrl(url).endsWith('/auth/login');
}

function isRefreshRequest(url: string): boolean {
  return normalizeUrl(url).endsWith('/auth/refresh');
}

function normalizeUrl(url: string): string {
  const [withoutQuery] = url.split('?');
  return withoutQuery.replace(/\/+$/, '');
}

function isUnauthorizedRoute(url: string): boolean {
  return normalizeUrl(url).endsWith('/no-autorizado');
}
