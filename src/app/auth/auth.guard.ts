import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (authSessionService.hasValidSession()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      redirect: state.url,
    },
  });
};

export const guestOnlyGuard: CanActivateFn = () => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (!authSessionService.hasValidSession()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (!authSessionService.hasValidSession()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        redirect: state.url,
      },
    });
  }

  const routeRoles = route.data?.['allowedRoles'];
  const allowedRoles =
    Array.isArray(routeRoles) && routeRoles.length > 0
      ? routeRoles.map((role) => Number(role)).filter((role) => Number.isFinite(role))
      : [1, 2];

  const currentRole = authSessionService.idRol();
  if (typeof currentRole === 'number' && allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree(['/no-autorizado'], {
    queryParams: {
      from: state.url,
    },
  });
};
