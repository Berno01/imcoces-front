import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

import { authInterceptor } from './auth/auth.interceptor';
import { AuthSessionService } from './auth/auth-session.service';
import { routes } from './app.routes';
import { SucursalService } from './shared/sucursal/sucursal.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthSessionService, SucursalService],
      useFactory: (authSessionService: AuthSessionService, sucursalService: SucursalService) => {
        return () =>
          firstValueFrom(
            authSessionService.bootstrapSession().pipe(
              switchMap(() =>
                authSessionService.hasValidSession() ? sucursalService.loadSucursales() : of([]),
              ),
              catchError(() => of([])),
            ),
          );
      },
    },
    provideRouter(routes),
  ],
};
