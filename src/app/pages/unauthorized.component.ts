import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  templateUrl: './unauthorized.component.html',
})
export class UnauthorizedComponent {
  private readonly authSessionService = inject(AuthSessionService);
  private readonly router = inject(Router);

  logout(): void {
    this.authSessionService.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }
}
