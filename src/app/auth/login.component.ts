import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { AuthSessionService } from './auth-session.service';
import { SucursalService } from '../shared/sucursal/sucursal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly sucursalService = inject(SucursalService);

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = computed(() => this.authSessionService.isLoginLoading());

  readonly form = this.fb.nonNullable.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.authSessionService.hasValidSession()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);

    this.authSessionService
      .login(this.form.getRawValue())
      .pipe(
        switchMap(() => this.sucursalService.loadSucursales(true).pipe(catchError(() => of([])))),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const currentRole = this.authSessionService.idRol();
          if (currentRole !== 1 && currentRole !== 2) {
            void this.router.navigateByUrl('/no-autorizado');
            return;
          }

          const redirectTarget = this.route.snapshot.queryParamMap.get('redirect');
          const safeRedirect =
            typeof redirectTarget === 'string' && redirectTarget.startsWith('/')
              ? redirectTarget
              : '/dashboard';

          void this.router.navigateByUrl(safeRedirect);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.mapLoginError(error));
        },
      });
  }

  private mapLoginError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo iniciar sesion. Intente nuevamente.';
    }

    if (error.status === 401) {
      return 'Credenciales invalidas o usuario inactivo.';
    }

    if (error.status === 429) {
      return 'Demasiados intentos. Espere un momento e intente nuevamente.';
    }

    if (error.status === 403) {
      return 'No tiene permisos para iniciar sesion en este sistema.';
    }

    return 'No se pudo iniciar sesion. Intente nuevamente.';
  }
}
