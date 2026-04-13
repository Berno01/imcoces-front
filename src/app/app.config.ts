import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { SucursalService } from './shared/sucursal/sucursal.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [SucursalService],
      useFactory: (sucursalService: SucursalService) => {
        return () =>
          firstValueFrom(
            sucursalService.loadSucursales().pipe(
              catchError(() => of([]))
            )
          );
      }
    },
    provideRouter(routes)
  ]
};
